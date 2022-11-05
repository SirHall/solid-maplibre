import { CircleLayerSpecification, MapLayerEventType } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { onCleanup, createUniqueId, splitProps } from "solid-js";
import { mapEffect, useMap } from "./map";
import { useSource } from "./source";
import { deepEqual } from "./util";

export type LayerProps = {
  id?: string;
  layer: Omit<CircleLayerSpecification, "id" | "source">;
} & LayerEvents;

type LayerEvents = Partial<{
  [P in keyof MapLayerEventType as `on${P}`]: (e: MapLayerEventType[P]) => void;
}>;

export function Layer(initial: LayerProps) {
  const [props, events] = splitProps(initial, ["id", "layer"]);
  const id = props.id || createUniqueId();
  const sourceId = useSource();

  mapEffect((map) => {
    if (!sourceId || map.getLayer(id)) return;

    map.addLayer({
      ...props.layer,
      id: id,
      source: sourceId,
    });
  });

  mapEffect((map) => {
    if (!map.getLayer(id)) return;

    for (const [k, v] of Object.entries(props.layer.paint || {})) {
      const old = map.getPaintProperty(id, k);
      if (!deepEqual(old, v)) {
        map.setPaintProperty(id, k, v);
      }
    }

    const oldFilter = map.getFilter(id);
    if (!deepEqual(oldFilter, props.layer.filter)) {
      map.setFilter(id, props.layer.filter);
    }
  });

  mapEffect((map) => {
    for (const [key, handler] of Object.entries(events)) {
      if (!key.startsWith("on")) continue;

      const name = key.slice(2).toLowerCase();
      map.on(name as never, id, handler as never);
      onCleanup(() => map.off(name as never, id, handler));
    }
  });

  onCleanup(() => useMap()?.()?.getLayer(id) && useMap()?.()?.removeLayer(id));

  return <></>;
}