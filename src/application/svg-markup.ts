export type Attributes = Readonly<Record<string, string | number | undefined>>;

const XML_ESCAPES: Readonly<Record<string, string>> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

export function escapeXml(text: string): string {
  return text.replace(/[&<>"]/g, (char) => XML_ESCAPES[char] ?? char);
}

/** Two decimals keep the files small without visible rounding at any zoom level. */
export function num(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function attributes(attrs: Attributes): string {
  return Object.entries(attrs)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => ` ${key}="${typeof value === "number" ? num(value) : escapeXml(value)}"`)
    .join("");
}

export function el(name: string, attrs: Attributes = {}, children: readonly string[] = []): string {
  return children.length === 0 ? `<${name}${attributes(attrs)}/>` : `<${name}${attributes(attrs)}>${children.join("")}</${name}>`;
}

export function svgDocument(width: number, height: number, title: string, children: readonly string[]): string {
  return (
    el(
      "svg",
      { xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${width} ${height}`, width, height, role: "img", "aria-labelledby": "title" },
      [el("title", { id: "title" }, [escapeXml(title)]), ...children],
    ) + "\n"
  );
}
