import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full border-2 border-gray-200 rounded-xl px-4 py-2 min-h-[44px] bg-white hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 shadow-sm hover:shadow-md text-gray-700 placeholder-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
