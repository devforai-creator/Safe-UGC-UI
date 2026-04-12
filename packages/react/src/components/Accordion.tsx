import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface AccordionItem {
  id: string;
  label: string;
  content?: ReactNode;
  disabled?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultExpanded?: string[];
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
}

function getEnabledAccordionIds(items: AccordionItem[]): string[] {
  return items
    .filter((item) => item.disabled !== true)
    .map((item) => item.id);
}

function getInitialExpandedIds(
  items: AccordionItem[],
  defaultExpanded: string[] | undefined,
  allowMultiple: boolean,
): string[] {
  const enabledIds = new Set(getEnabledAccordionIds(items));
  const initial = (defaultExpanded ?? []).filter((id) => enabledIds.has(id));
  return allowMultiple ? initial : initial.slice(0, 1);
}

function getReconciledExpandedIds(
  currentExpandedIds: string[],
  items: AccordionItem[],
  defaultExpanded: string[] | undefined,
  allowMultiple: boolean,
): string[] {
  const enabledIds = getEnabledAccordionIds(items);
  if (enabledIds.length === 0) {
    return [];
  }

  const enabledSet = new Set(enabledIds);
  const currentValid = currentExpandedIds.filter((id) => enabledSet.has(id));
  if (currentValid.length > 0) {
    return allowMultiple ? currentValid : currentValid.slice(0, 1);
  }

  return getInitialExpandedIds(items, defaultExpanded, allowMultiple);
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultExpanded,
  style,
  hoverStyle,
}: AccordionProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  const [expandedIds, setExpandedIds] = useState<string[]>(
    () => getInitialExpandedIds(items, defaultExpanded, allowMultiple),
  );
  const baseId = useId();

  useEffect(() => {
    setExpandedIds((current) => {
      const next = getReconciledExpandedIds(
        current,
        items,
        defaultExpanded,
        allowMultiple,
      );

      if (
        current.length === next.length &&
        current.every((id, index) => id === next[index])
      ) {
        return current;
      }

      return next;
    });
  }, [items, defaultExpanded, allowMultiple]);

  const expandedSet = new Set(expandedIds);

  const toggleItem = (itemId: string, disabled: boolean | undefined) => {
    if (disabled) {
      return;
    }

    setExpandedIds((current) => {
      const currentSet = new Set(current);
      if (allowMultiple) {
        if (currentSet.has(itemId)) {
          currentSet.delete(itemId);
        } else {
          currentSet.add(itemId);
        }
        return [...currentSet];
      }

      return currentSet.has(itemId) ? [] : [itemId];
    });
  };

  return (
    <div style={resolvedStyle} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {items.map((item) => {
        const expanded = expandedSet.has(item.id);
        const buttonId = `${baseId}-${item.id}-button`;
        const panelId = `${baseId}-${item.id}-panel`;

        return (
          <div
            key={item.id}
            style={{
              borderTop: '1px solid rgba(148, 163, 184, 0.25)',
            }}
          >
            <button
              id={buttonId}
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              disabled={item.disabled}
              onClick={() => toggleItem(item.id, item.disabled)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                textAlign: 'left',
                cursor: item.disabled ? 'default' : 'pointer',
                opacity: item.disabled ? 0.5 : 1,
              }}
            >
              <span>{item.label}</span>
              <span aria-hidden="true">{expanded ? '-' : '+'}</span>
            </button>
            {expanded ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                style={{ paddingBottom: 12 }}
              >
                {item.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
