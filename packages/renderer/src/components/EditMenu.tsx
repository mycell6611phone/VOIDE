import React from "react";

export const EDIT_MENU_ITEMS = [
  "Cut",
  "Copy",
  "Paste",
  "Reverse Inputs",
  "Delete"
] as const;
export type EditMenuItemLabel = (typeof EDIT_MENU_ITEMS)[number];

export const EDIT_MENU_WIDTH = 176;
export const EDIT_MENU_HEIGHT = 232;
export const EDIT_MENU_DATA_ATTRIBUTE = "data-voide-edit-menu";

const baseStyle: React.CSSProperties = {
  position: "fixed",
  minWidth: EDIT_MENU_WIDTH,
  background: "#fff1f2",
  border: "1px solid rgba(244, 63, 94, 0.38)",
  borderRadius: 12,
  boxShadow: "0 18px 36px rgba(190, 18, 60, 0.28)",
  padding: 6,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  zIndex: 160,
  pointerEvents: "auto"
};

const itemStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "#7f1d1d",
  fontWeight: 600,
  fontSize: 13,
  textAlign: "left" as const,
  cursor: "pointer"
};

const disabledItemStyle: React.CSSProperties = {
  ...itemStyle,
  color: "rgba(127, 29, 29, 0.4)",
  cursor: "not-allowed"
};

export interface EditMenuItem {
  label: EditMenuItemLabel;
  onSelect: () => void;
  disabled?: boolean;
}

interface EditMenuProps {
  position: { left: number; top: number };
  items: EditMenuItem[];
}

export default function EditMenu({ position, items }: EditMenuProps) {
  return (
    <div
      {...{ [EDIT_MENU_DATA_ATTRIBUTE]: "" }}
      style={{ ...baseStyle, left: position.left, top: position.top }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          disabled={item.disabled}
          style={item.disabled ? disabledItemStyle : itemStyle}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (item.disabled) {
              return;
            }
            item.onSelect();
          }}
          onMouseEnter={(event) => {
            if (item.disabled) {
              return;
            }
            (event.currentTarget as HTMLButtonElement).style.background =
              "rgba(248, 113, 113, 0.18)";
          }}
          onMouseLeave={(event) => {
            (event.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

