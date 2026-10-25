/** Shared surface for text inputs, selects and date triggers in every color scheme. */
export const controlSurface =
  "w-full min-w-0 rounded-[9px] border border-[#b8c6ac] bg-white px-3 py-[11px] text-base leading-normal text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50";

/** Shared hover, keyboard focus and error states for form controls. */
export const controlStyles =
  "transition-[border-color,box-shadow,background-color] duration-180 ease-in-out hover:enabled:not-focus:border-[#8da77d] focus:border-[#557a43]! focus:outline-none focus:outline-offset-0 focus:ring-0 focus:shadow-[0_0_0_1px_#557a43]! aria-invalid:border-[#a13e2e]! aria-invalid:focus:shadow-[0_0_0_1px_#a13e2e]! motion-reduce:transition-none";
