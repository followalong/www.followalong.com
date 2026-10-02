use std::{collections::HashMap, env, path::PathBuf, process::Command};

fn main() {
    tauri_build::build();
    globalize_swift_bridge();
}

/// Xcode 27 builds a Swift package's release configuration with whole-module optimization
/// and prelinks each module into one object. That demotes every `@_cdecl` export in
/// `libTauri.a` to a local symbol, and the release link fails on `_run_plugin_command` and
/// `_string_from_bytes`. No compiler flag changes it. swift-rs tries the same repair with
/// `llvm-objcopy`, which the asdf toolchain does not carry, and only on the package's own
/// object. So every member of every Swift package archive is repaired here.
///
/// It lives in build.rs because `cargo tauri ios init` rewrites `gen/apple/`.
/// `DEP_TAURI_IOS_LIBRARY_PATH` comes from tauri's build script, so it is set only on iOS,
/// and only once the Swift package is built.
fn globalize_swift_bridge() {
    if env::var_os("DEP_TAURI_IOS_LIBRARY_PATH").is_none() {
        return;
    }
    let archives = find_archives();
    if archives.is_empty() {
        return;
    }
    let Some(objcopy) = find_objcopy() else {
        println!("cargo:warning=no objcopy in the Rust sysroot; the Swift bridge stays local");
        return;
    };
    for archive in archives {
        repair(&objcopy, &archive);
    }
}

/// Promote one archive's `@_cdecl` exports back to global, then link it again.
fn repair(objcopy: &std::path::Path, archive: &std::path::Path) {
    let Ok(nm) = Command::new("nm").arg(archive).output() else {
        return;
    };

    let mut counts: HashMap<String, u32> = HashMap::new();
    let mut locals: Vec<String> = Vec::new();
    for line in String::from_utf8_lossy(&nm.stdout).lines() {
        let mut fields = line.split_whitespace();
        let (Some(_addr), Some(kind), Some(name), None) =
            (fields.next(), fields.next(), fields.next(), fields.next())
        else {
            continue;
        };
        *counts.entry(name.to_string()).or_default() += 1;
        // A @_cdecl export is a plain C identifier. Anything else is a compiler helper,
        // and promoting those collides at link time.
        let bare = name.strip_prefix('_').unwrap_or_default();
        if kind == "t"
            && !bare.is_empty()
            && !bare.starts_with('_')
            && bare.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
            && !locals.iter().any(|s| s == name)
        {
            locals.push(name.to_string());
        }
    }
    // Duplicate global names crash Xcode 27's linker, so keep the unique ones.
    let symbols: Vec<&String> = locals
        .iter()
        .filter(|s| counts.get(*s).copied().unwrap_or(0) == 1)
        .collect();
    if !symbols.is_empty() {
        let mut cmd = Command::new(objcopy);
        for s in &symbols {
            cmd.arg(format!("--globalize-symbol={s}"));
        }
        if !cmd.arg(archive).status().map(|s| s.success()).unwrap_or(false) {
            panic!("failed to globalize the Swift bridge in {}", archive.display());
        }
    }

    // The tauri rlib bundled this archive while its symbols were still local. Link the
    // repaired archive again so the final link resolves against the global ones.
    let (Some(dir), Some(stem)) = (archive.parent(), archive.file_stem()) else {
        return;
    };
    let name = stem.to_string_lossy();
    println!("cargo:rustc-link-search=native={}", dir.display());
    println!("cargo:rustc-link-lib=static={}", name.strip_prefix("lib").unwrap_or(&name));
}

/// Each build script leaves its archive in its own OUT_DIR, a sibling of ours, under
/// `out/swift-rs/<package>/.../lib<package>.a`. Newest per name: cargo keeps old ones.
fn find_archives() -> Vec<PathBuf> {
    let Some(out_dir) = env::var_os("OUT_DIR").map(PathBuf::from) else {
        return Vec::new();
    };
    let Some(build_dir) = out_dir.parent().and_then(|p| p.parent()) else {
        return Vec::new();
    };
    let Ok(entries) = std::fs::read_dir(build_dir) else {
        return Vec::new();
    };

    let mut newest: HashMap<String, (std::time::SystemTime, PathBuf)> = HashMap::new();
    for entry in entries.flatten() {
        for found in walk(&entry.path().join("out/swift-rs")) {
            let Some(name) = found.file_name().map(|n| n.to_string_lossy().into_owned()) else {
                continue;
            };
            let Ok(time) = found.metadata().and_then(|m| m.modified()) else {
                continue;
            };
            if newest.get(&name).map_or(true, |(t, _)| time > *t) {
                newest.insert(name, (time, found));
            }
        }
    }
    newest.into_values().map(|(_, path)| path).collect()
}

fn walk(dir: &std::path::Path) -> Vec<PathBuf> {
    let mut hits = Vec::new();
    let Ok(entries) = std::fs::read_dir(dir) else {
        return hits;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            hits.extend(walk(&path));
        } else if path.extension().is_some_and(|e| e == "a") {
            hits.push(path);
        }
    }
    hits
}

/// rustup names it llvm-objcopy, asdf's toolchain names it rust-objcopy. Apple ships neither.
fn find_objcopy() -> Option<PathBuf> {
    let sysroot = Command::new("rustc").args(["--print", "sysroot"]).output().ok()?;
    let sysroot = String::from_utf8_lossy(&sysroot.stdout).trim().to_string();
    let bin = PathBuf::from(sysroot)
        .join("lib/rustlib")
        .join(format!("{}-apple-darwin", std::env::consts::ARCH))
        .join("bin");
    ["llvm-objcopy", "rust-objcopy"]
        .iter()
        .map(|name| bin.join(name))
        .find(|path| path.exists())
}
