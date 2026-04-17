const HATTRICK_BASE = "https://www.hattrick.org";

interface AvatarLayer {
  x: number;
  y: number;
  image: string;
}

interface PlayerAvatarProps {
  backgroundImage: string;
  layers: AvatarLayer[];
}

function resolveUrl(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("http")) return uri;
  return `${HATTRICK_BASE}${uri}`;
}

export function PlayerAvatar({ backgroundImage, layers }: PlayerAvatarProps) {
  if (!backgroundImage) {
    return (
      <div className="w-[110px] h-[155px] rounded bg-gray-100 flex items-center justify-center shrink-0">
        <span className="text-gray-300 text-3xl">?</span>
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded"
      style={{ width: 110, height: 155 }}
    >
      {layers
        .filter((layer) => !layer.image.includes("/numbers/"))
        .map((layer, i) => (
          <img
            key={i}
            src={resolveUrl(layer.image)}
            alt=""
            style={{
              position: "absolute",
              left: layer.x,
              top: layer.y,
            }}
          />
        ))}
    </div>
  );
}

interface PlayerAvatarFromJsonProps {
  avatarBackground: string;
  avatarLayers: string;
}

export function PlayerAvatarFromJson({
  avatarBackground,
  avatarLayers,
}: PlayerAvatarFromJsonProps) {
  let layers: AvatarLayer[] = [];
  try {
    layers = JSON.parse(avatarLayers);
  } catch {
    layers = [];
  }

  return <PlayerAvatar backgroundImage={avatarBackground} layers={layers} />;
}
