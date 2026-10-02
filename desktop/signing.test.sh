#!/bin/sh
# The Mac release signs with $APPLE_SIGNING_IDENTITY. Several Developer ID certificates share
# one name in the keychain and codesign refuses a name that matches two, so it must be a
# SHA-1. It must come from the G2 Sub-CA: the first Sub-CA's certificates stop signing on
# 2027-02-01. And it must belong to the team tauri.conf.json names.
set -e
here=$(cd "$(dirname "$0")" && pwd)

python3 - "$here/src-tauri/tauri.conf.json" "${APPLE_SIGNING_IDENTITY:-}" <<'EOF2'
import hashlib, json, re, subprocess, sys

team = json.load(open(sys.argv[1]))["bundle"]["iOS"]["developmentTeam"]
identity = sys.argv[2]
assert identity, "APPLE_SIGNING_IDENTITY is not set; `security find-identity -v -p codesigning` lists the candidates"
assert re.fullmatch(r"[0-9A-F]{40}", identity), f"APPLE_SIGNING_IDENTITY {identity!r} is a name; several certificates share it"

pems = subprocess.run(["security", "find-certificate", "-a", "-p", "-c", "Developer ID Application"],
                      capture_output=True, text=True, check=True).stdout.split("-----END CERTIFICATE-----")
found = {}
for pem in filter(lambda p: "BEGIN" in p, pems):
    pem = (pem.strip() + "\n-----END CERTIFICATE-----\n").encode()
    der = subprocess.run(["openssl", "x509", "-outform", "DER"], input=pem, capture_output=True, check=True).stdout
    names = subprocess.run(["openssl", "x509", "-inform", "DER", "-noout", "-issuer", "-subject"], input=der, capture_output=True, check=True).stdout.decode()
    found[hashlib.sha1(der).hexdigest().upper()] = names
assert identity in found, f"{identity} is not a Developer ID Application certificate in this keychain"
issuer, subject = found[identity].splitlines()[:2]
assert re.search(r"OU ?= ?G2", issuer), f"{identity} is not from the G2 Sub-CA: {issuer}"
assert team in subject, f"{identity} is not team {team}'s certificate: {subject}"
print("signing: ok")
EOF2
