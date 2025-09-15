import { useEffect, type RefObject } from 'react';

/**
 * Arreglo iOS para modales:
 * - Bloquea scroll del fondo (body) y recuerda posición.
 * - Permite solo scroll vertical dentro del modal.
 * - Cuando un input recibe foco, lo desplaza a la vista (sin “saltos”).
 *
 * Usa junto con los estilos de app.css (body.modal-open y .modal/.modal-content).
 */
export default function useModalIOSFix(
  active: boolean,
  containerRef?: RefObject<HTMLElement>
) {
  useEffect(() => {
    if (!active) return;

    const body = document.body;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

    // Bloquea fondo y conserva posición
    body.classList.add('modal-open');
    // truco para que al soltar el modal vuelvas a la misma posición
    body.style.top = `-${scrollY}px`;

    // Hace visible el input enfocado dentro del contenedor scrollable del modal
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;

      const tag = el.tagName;
      const isField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (!isField) return;

      const container =
        containerRef?.current ||
        (document.querySelector('.modal-content') as HTMLElement | null);

      if (!container) return;

      // Desplazamiento suave para que el campo quede visible sobre el teclado
      requestAnimationFrame(() => {
        ensureVisible(container, el, 20);
      });
    };

    // Evita que el overlay “arrastre” el fondo (permitimos scroll solo dentro del modal)
    const preventBgScroll = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      const container =
        containerRef?.current ||
        (document.querySelector('.modal-content') as HTMLElement | null);

      if (!container || !target) return;

      // Si el gesto ocurre dentro del contenedor scrollable, permitimos (vertical)
      if (container.contains(target)) return;

      // Si es fuera, bloqueamos (no desplazamos el fondo)
      e.preventDefault();
    };

    document.addEventListener('focusin', onFocusIn as any, { passive: true });
    document.addEventListener('touchmove', preventBgScroll, { passive: false });

    return () => {
      document.removeEventListener('focusin', onFocusIn as any);
      document.removeEventListener('touchmove', preventBgScroll as any);

      // Restaurar scroll del body
      body.classList.remove('modal-open');
      const top = body.style.top;
      body.style.top = '';

      // Devuelve a la posición anterior
      const prev = top ? Math.abs(parseInt(top, 10)) : 0;
      window.scrollTo({ top: prev, left: 0, behavior: 'instant' as ScrollBehavior });
    };
  }, [active, containerRef]);
}

/** Garantiza que `el` esté visible dentro de `container` con padding. */
function ensureVisible(container: HTMLElement, el: HTMLElement, padding = 16) {
  const cRect = container.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();

  // Si el campo queda por debajo del viewport del contenedor → scrollDown
  if (eRect.bottom > cRect.bottom - padding) {
    container.scrollTop += eRect.bottom - (cRect.bottom - padding);
  }
  // Si queda por encima → scrollUp
  else if (eRect.top < cRect.top + padding) {
    container.scrollTop -= (cRect.top + padding) - eRect.top;
  }
}
