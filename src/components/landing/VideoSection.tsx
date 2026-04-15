import SectionCtaButton from "./SectionCtaButton";

interface VideoSectionProps {
  section: any;
}

const getEmbedUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("embed")) return url;
  const match = url.match(/(?:youtu\.be\/|v=)([^&\s]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
};

const VideoSection = ({ section }: VideoSectionProps) => {
  const videoUrl = section.video_url;

  if (!videoUrl) return null;

  return (
    <section style={{ backgroundColor: section.bg_color || undefined, color: section.text_color || undefined }}>
      <div className="max-w-5xl mx-auto px-4 py-16">
        {section.title && (
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">{section.title}</h2>
          </div>
        )}
        {section.content && (
          <p className="text-center text-sm md:text-base opacity-80 max-w-2xl mx-auto mb-8">{section.content}</p>
        )}
        <div className="aspect-video rounded-xl overflow-hidden border shadow-lg">
          <iframe
            src={getEmbedUrl(videoUrl)}
            title={section.title || "Vídeo"}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <SectionCtaButton section={section} />
      </div>
    </section>
  );
};

export default VideoSection;
