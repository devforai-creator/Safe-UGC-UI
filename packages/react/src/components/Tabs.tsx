import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { useHoverStyle } from '../hooks/useHoverStyle.js';

interface TabsItem {
  id: string;
  label: string;
  content?: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabsItem[];
  defaultTab?: string;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
}

function getEnabledTabIds(tabs: TabsItem[]): string[] {
  return tabs.filter((tab) => tab.disabled !== true).map((tab) => tab.id);
}

function getInitialSelectedTab(
  tabs: TabsItem[],
  defaultTab: string | undefined,
): string | undefined {
  const enabledIds = getEnabledTabIds(tabs);
  if (enabledIds.length === 0) {
    return undefined;
  }

  if (defaultTab && enabledIds.includes(defaultTab)) {
    return defaultTab;
  }

  return enabledIds[0];
}

function getNextEnabledIndex(tabs: TabsItem[], startIndex: number, direction: 1 | -1): number {
  for (let offset = 1; offset <= tabs.length; offset++) {
    const nextIndex = (startIndex + direction * offset + tabs.length) % tabs.length;
    if (tabs[nextIndex]?.disabled !== true) {
      return nextIndex;
    }
  }

  return startIndex;
}

function focusTab(
  buttonRefs: MutableRefObject<Array<HTMLButtonElement | null>>,
  index: number,
): void {
  buttonRefs.current[index]?.focus();
}

export function Tabs({ tabs, defaultTab, style, hoverStyle }: TabsProps) {
  const { style: resolvedStyle, onMouseEnter, onMouseLeave } = useHoverStyle(style, hoverStyle);
  const [selectedTab, setSelectedTab] = useState<string | undefined>(() =>
    getInitialSelectedTab(tabs, defaultTab),
  );
  const baseId = useId();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setSelectedTab((current) => {
      const enabledIds = getEnabledTabIds(tabs);
      if (enabledIds.length === 0) {
        return undefined;
      }

      if (current && enabledIds.includes(current)) {
        return current;
      }

      if (defaultTab && enabledIds.includes(defaultTab)) {
        return defaultTab;
      }

      return enabledIds[0];
    });
  }, [tabs, defaultTab]);

  const selectedItem =
    tabs.find((tab) => tab.id === selectedTab && tab.disabled !== true) ??
    tabs.find((tab) => tab.disabled !== true);

  const activateTab = (index: number, focus = false) => {
    const tab = tabs[index];
    if (!tab || tab.disabled) {
      return;
    }

    setSelectedTab(tab.id);
    if (focus) {
      focusTab(buttonRefs, index);
    }
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        activateTab(getNextEnabledIndex(tabs, index, 1), true);
        break;
      }

      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        activateTab(getNextEnabledIndex(tabs, index, -1), true);
        break;
      }

      case 'Home': {
        event.preventDefault();
        const firstEnabledIndex = tabs.findIndex((tab) => tab.disabled !== true);
        if (firstEnabledIndex >= 0) {
          activateTab(firstEnabledIndex, true);
        }
        break;
      }

      case 'End': {
        event.preventDefault();
        const lastEnabledIndex = [...tabs]
          .map((tab, currentIndex) => ({ tab, currentIndex }))
          .reverse()
          .find(({ tab }) => tab.disabled !== true);
        if (lastEnabledIndex) {
          activateTab(lastEnabledIndex.currentIndex, true);
        }
        break;
      }

      default:
        break;
    }
  };

  return (
    <div style={resolvedStyle} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
          paddingBottom: 8,
        }}
      >
        {tabs.map((tab, index) => {
          const selected = selectedItem?.id === tab.id;
          const tabId = `${baseId}-${tab.id}-tab`;
          const panelId = `${baseId}-${tab.id}-panel`;

          return (
            <button
              key={tab.id}
              ref={(element) => {
                buttonRefs.current[index] = element;
              }}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              disabled={tab.disabled}
              tabIndex={selected ? 0 : -1}
              onClick={() => activateTab(index)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: selected ? 'rgba(148, 163, 184, 0.16)' : 'transparent',
                color: 'inherit',
                cursor: tab.disabled ? 'default' : 'pointer',
                opacity: tab.disabled ? 0.5 : 1,
                fontWeight: selected ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {selectedItem ? (
        <div
          id={`${baseId}-${selectedItem.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-${selectedItem.id}-tab`}
          style={{ paddingTop: 12 }}
        >
          {selectedItem.content}
        </div>
      ) : null}
    </div>
  );
}
