type Row = { scrollLeft: number; clientWidth: number };
type Tab = { offsetLeft: number; offsetWidth: number };

/** Scrolls only the tab row, never the page, so a selected tab past the row's edge comes into view. */
export function scrollTabIntoRow(row: Row, tab: Tab) {
  const right = tab.offsetLeft + tab.offsetWidth;
  if (tab.offsetLeft < row.scrollLeft) row.scrollLeft = tab.offsetLeft;
  else if (right > row.scrollLeft + row.clientWidth) row.scrollLeft = right - row.clientWidth;
}
