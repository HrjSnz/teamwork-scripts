const TIME_ZONE = "Europe/Prague";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatDate = (timestamp: number): string => dateFormatter.format(new Date(timestamp));

const formatTime = (timestamp: number): string =>
  timeFormatter.format(new Date(timestamp)).replace(/\s/g, "");

export const formatRange = (startTimestamp: number, endTimestamp: number): string => {
  const endsOnLaterDay = formatDate(endTimestamp) !== formatDate(startTimestamp);
  const nextDayMarker = endsOnLaterDay ? "+1" : "";
  return `${formatTime(startTimestamp)}–${formatTime(endTimestamp)}${nextDayMarker}`;
};

export const formatMinutes = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} h ${minutes} min`;
};

const truncate = (value: string, maxLength: number): string => {
  const text = String(value);
  return text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text;
};

function formatTableRow(cells: string[], columnWidths: number[], maxWidths: number[]): string {
  return cells
    .map((cell, column) => truncate(cell, maxWidths[column]).padEnd(columnWidths[column]))
    .join(" │ ");
}

export function renderTable(headers: string[], rows: string[][], maxWidths: number[]): string {
  const columnWidths = headers.map((header, column) => {
    const cellLengths = rows.map((row) => truncate(row[column], maxWidths[column]).length);
    return Math.max(header.length, ...cellLengths, 0);
  });
  const separator = columnWidths.map((width) => "─".repeat(width)).join("─┼─");
  const headerLine = formatTableRow(headers, columnWidths, maxWidths);
  const bodyLines = rows.map((row) => formatTableRow(row, columnWidths, maxWidths));
  return [headerLine, separator, ...bodyLines].join("\n");
}
