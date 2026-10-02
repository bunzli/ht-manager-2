import { useState } from "react";
import type { Player } from "../lib/types";

interface Layer {
  x: number;
  y: number;
  image: string;
}

function avatarLayers(value?: string): Layer[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter(
          (layer): layer is Layer =>
            layer &&
            Number.isFinite(layer.x) &&
            Number.isFinite(layer.y) &&
            typeof layer.image === "string" &&
            !!layer.image,
        )
      : [];
  } catch {
    return [];
  }
}

export function PlayerAvatar({ player }: { player: Player }) {
  const imageKey = `${player.avatarBackground ?? ""}:${player.avatarLayers ?? ""}`;
  return <Avatar key={imageKey} player={player} />;
}

function Avatar({ player }: { player: Player }) {
  const [failed, setFailed] = useState(false);
  const [size, setSize] = useState({ width: 92, height: 123 });
  const layers = avatarLayers(player.avatarLayers);
  const hasImage = !!player.avatarBackground || layers.length > 0;
  return (
    <div className="relative h-[75px] w-14 shrink-0 overflow-hidden rounded-md" aria-hidden="true">
      {hasImage && !failed ? (
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: size.width,
            height: size.height,
            transform: `scale(${Math.min(56 / size.width, 75 / size.height)})`,
          }}
        >
          {player.avatarBackground && (
            <img
              src={player.avatarBackground}
              alt=""
              onError={() => setFailed(true)}
              onLoad={(event) =>
                setSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              className="absolute left-0 top-0 max-w-none"
            />
          )}
          {layers.map((layer, index) => (
            <img
              key={index}
              src={layer.image}
              alt=""
              onError={() => setFailed(true)}
              className="absolute max-w-none"
              style={{ left: layer.x, top: layer.y }}
            />
          ))}
        </div>
      ) : (
        <div className="grid h-full place-items-center rounded-md bg-[#edf2ed] text-xl font-medium text-[#507653]">
          {player.firstName.charAt(0)}
          {player.lastName.charAt(0)}
        </div>
      )}
    </div>
  );
}
