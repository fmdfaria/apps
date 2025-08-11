import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"
import { useEffect } from "react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  // Força o posicionamento do botão de fechar via JavaScript
  useEffect(() => {
    const interval = setInterval(() => {
      const closeButtons = document.querySelectorAll('[data-sonner-toast] button, [data-close-button]');
      closeButtons.forEach((button: Element) => {
        const btn = button as HTMLElement;
        btn.style.position = 'absolute';
        btn.style.right = '8px';
        btn.style.top = '8px';
        btn.style.left = 'auto';
        btn.style.zIndex = '999';
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton={true}
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-transparent !text-white !border-transparent !shadow-lg !relative",
          description: "!text-white !opacity-100",
          actionButton:
            "group-[.toast]:bg-white/20 group-[.toast]:text-white group-[.toast]:hover:bg-white/30",
          cancelButton:
            "group-[.toast]:bg-white/20 group-[.toast]:text-white group-[.toast]:hover:bg-white/30",
          closeButton: 
            "!bg-white/20 !text-white hover:!bg-white/30 !border-transparent !absolute !right-2 !top-2 !p-1 !m-0 !z-50",
        },
        style: {
          position: 'relative',
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
