<template>
  <div class="border-b border-gray-200 pb-5 mb-8">
    <div class="sm:flex sm:items-baseline sm:justify-between">
      <div class="sm:w-0 sm:flex-1">
        <h1
          aria-label="Page title"
          class="text-lg font-medium text-gray-900 group flex items-center"
        >
          <!-- <svg viewBox="0 0 512 512" class="h-5 w-5 flex-shrink-0 text-gray-300 mr-3 group flex items-center"><path class="" fill="currentColor" d="M487.4 315.7l-42.6-24.6c4.3-23.2 4.3-47 0-70.2l42.6-24.6c4.9-2.8 7.1-8.6 5.5-14-11.1-35.6-30-67.8-54.7-94.6-3.8-4.1-10-5.1-14.8-2.3L380.8 110c-17.9-15.4-38.5-27.3-60.8-35.1V25.8c0-5.6-3.9-10.5-9.4-11.7-36.7-8.2-74.3-7.8-109.2 0-5.5 1.2-9.4 6.1-9.4 11.7V75c-22.2 7.9-42.8 19.8-60.8 35.1L88.7 85.5c-4.9-2.8-11-1.9-14.8 2.3-24.7 26.7-43.6 58.9-54.7 94.6-1.7 5.4.6 11.2 5.5 14L67.3 221c-4.3 23.2-4.3 47 0 70.2l-42.6 24.6c-4.9 2.8-7.1 8.6-5.5 14 11.1 35.6 30 67.8 54.7 94.6 3.8 4.1 10 5.1 14.8 2.3l42.6-24.6c17.9 15.4 38.5 27.3 60.8 35.1v49.2c0 5.6 3.9 10.5 9.4 11.7 36.7 8.2 74.3 7.8 109.2 0 5.5-1.2 9.4-6.1 9.4-11.7v-49.2c22.2-7.9 42.8-19.8 60.8-35.1l42.6 24.6c4.9 2.8 11 1.9 14.8-2.3 24.7-26.7 43.6-58.9 54.7-94.6 1.5-5.5-.7-11.3-5.6-14.1zM256 336c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z"></path></svg> -->
          {{ title }}
        </h1>

        <p class="mt-1 truncate text-sm text-gray-500">
          <slot name="description" />
        </p>
      </div>

      <div class="flex items-center justify-between sm:ml-6 sm:flex-shrink-0 sm:justify-start">
        <div class="relative ml-3 inline-block text-left">
          <div>
            <slot name="meta" />
            <!-- <button
              id="menu-0-button"
              type="button"
              class="-my-2 flex items-center rounded-full bg-white p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-expanded="false"
              aria-haspopup="true"
            >
              <span class="sr-only">Open options</span>
              Heroicon name: mini/ellipsis-vertical
              <svg
                class="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
              </svg>
            </button> -->
          </div>

          <!-- Dropdown menu, show/hide based on menu state.

          Entering: "transition ease-out duration-100"
          From: "transform opacity-0 scale-95"
          To: "transform opacity-100 scale-100"
          Leaving: "transition ease-in duration-75"
          From: "transform opacity-100 scale-100"
          To: "transform opacity-0 scale-95" -->

          <!-- <div
            class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="menu-0-button"
            tabindex="-1"
          >
            <div
              class="py-1"
              role="none"
            >
              <a
                id="menu-0-item-0"
                href="#"
                class="text-gray-700 flex justify-between px-4 py-2 text-sm"
                role="menuitem"
                tabindex="-1"
              >
                <span>Catch me up</span>
              </a>
              <a
                id="menu-0-item-1"
                href="#"
                class="text-gray-700 flex justify-between px-4 py-2 text-sm"
                role="menuitem"
                tabindex="-1"
              >
                <span>Edit feed</span>
              </a>
              <button
                id="menu-0-item-2"
                type="button"
                class="text-gray-700 flex w-full justify-between px-4 py-2 text-sm"
                role="menuitem"
                tabindex="-1"
              >
                <span>Remove feed</span>
              </button>
            </div>
          </div>
        </div> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['title']
}
</script>
