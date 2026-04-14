interface FooterSectionProps {
  section: any;
}

const FooterSection = ({ section }: FooterSectionProps) => {
  return (
    <footer style={{ backgroundColor: section.bg_color, color: section.text_color }}>
      <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm opacity-70">
        {section.content || `© ${new Date().getFullYear()} Pollicell. Todos os direitos reservados.`}
      </div>
    </footer>
  );
};

export default FooterSection;
