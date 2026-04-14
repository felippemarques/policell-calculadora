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

  return (
    <section style={{ backgroundColor: section.bg_color, color: section.text_color }}>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-8 max-w-[140px] object-contain mb-4" />
            ) : (
              <span className="text-lg font-bold block mb-4">Pollicell</span>
            )}
            <p className="text-sm opacity-60">Seu aparelho vale mais do que você imagina.</p>
          </div>
          {columns.map((col: any, i: number) => (
            <div key={i}>
              <h4 className="font-semibold text-sm mb-3">{col.title}</h4>
              <ul className="space-y-2">
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
