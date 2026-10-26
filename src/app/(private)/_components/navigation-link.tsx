"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useFinanceRefresh } from "./refresh-context";

export function NavigationLink({
  href,
  onClick,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { navigate } = useFinanceRefresh();
  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === "_blank" ||
          props.download
        )
          return;
        event.preventDefault();
        navigate(href);
      }}
    />
  );
}
