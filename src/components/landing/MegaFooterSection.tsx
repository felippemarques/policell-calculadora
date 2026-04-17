interface MegaFooterSectionProps {
  section: any;
  settings: Record<string, string>;
}

const defaultColumns = [
  {
    title: "Institucional",
    links: [
      { label: "Sobre nós", url: "#" },
      { label: "Política de Privacidade", url: "#" },
      { label: "Termos de Uso", url: "#" },
    ],
  },
  {
    title: "Ajuda",
    links: [
      { label: "Como funciona", url: "#" },
      { label: "Dúvidas frequentes", url: "#" },
      { label: "Contato", url: "#" },
    ],
  },
  {
    title: "Redes Sociais",
    links: [
      { label: "Instagram", url: "#" },
      { label: "Facebook", url: "#" },
      { label: "WhatsApp", url: "#" },
    ],
  },
];

const MegaFooterSection = ({ section, settings }: MegaFooterSectionProps) => {
  let columns = defaultColumns;
  try {
    if (section.content) columns = JSON.parse(section.content);
  } catch {}

  const bgColor = section.bg_color || settings.footer_bg_color || undefined;
  const textColor = section.text_color || settings.footer_text_color || undefined;

  return (
    <section style={{ backgroundColor: bgColor, color: textColor }} className="border-t border-black/5">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          <div>
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-8 max-w-[140px] object-contain mb-5" />
            ) : (
              <span className="text-lg font-semibold tracking-tight block mb-5">Pollicell</span>
            )}
            <p className="text-sm opacity-60 leading-relaxed">Seu aparelho vale mais do que você imagina.</p>
          </div>
          {columns.map((col: any, i: number) => (
            <div key={i}>
              <h4 className="font-semibold text-sm mb-4 tracking-tight">{col.title}</h4>
              <ul className="space-y-3">
                {col.links?.map((link: any, j: number) => (
                  <li key={j}>
                    <a href={link.url} className="text-sm opacity-60 hover:opacity-100 transition-opacity">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MegaFooterSection;
