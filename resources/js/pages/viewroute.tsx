import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import { usePage } from "@inertiajs/react";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = "pk.eyJ1IjoiZGVsYmVsIiwiYSI6ImNsaHVyYmp0NDAycDYzY254Zzl6cDhqaWYifQ.BZ91hrevKjGvhzju4p6EMA";

export default function ViewRoute() {
    const { props } = usePage();
    const uuid = props.uuid as string;

    const [metaStats, setMetaStats] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    const mapContainer = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    useEffect(() => {
        if (mapContainer.current && !mapRef.current) {
            mapRef.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: "mapbox://styles/mapbox/dark-v10",
                center: [0, 0],
                zoom: 2,
            });
        }
    }, []);

    useEffect(() => {
        if (!uuid) return;

        const fetchRoute = async () => {
            try {
                const res = await fetch(`/api/get/${uuid}`);
                if (!res.ok) throw new Error("Failed to load route");

                const data = await res.json();
                const geoJson = data
                const stats = data.meta_stats;

                setMetaStats(stats);

                if (mapRef.current) {
                    if (mapRef.current.getSource("route")) {
                        (mapRef.current.getSource(
                            "route"
                        ) as mapboxgl.GeoJSONSource).setData(geoJson);
                    } else {
                        mapRef.current.addSource("route", {
                            type: "geojson",
                            data: geoJson,
                        });

                        mapRef.current.addLayer({
                            id: "route-line",
                            type: "line",
                            source: "route",
                            paint: {
                                "line-color": "#22d3ee",
                                "line-width": 3,
                            },
                        });
                    }

                    const bounds = new mapboxgl.LngLatBounds();
                    geoJson.features.forEach((f: any) => {
                        f.geometry.coordinates.forEach((c: any) => bounds.extend(c));
                    });
                    mapRef.current.fitBounds(bounds, { padding: 40 });
                }
            } catch (err: any) {
                setError(err.message || "Failed to load route");
            }
        };

        fetchRoute();
    }, [uuid]);

    return (
        <div className="min-h-screen bg-black text-white font-mono p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <pre className="text-sm text-gray-400">├── /map</pre>
                <div
                    ref={mapContainer}
                    className="w-full h-[500px] border border-gray-700 rounded relative"
                ></div>

                {metaStats && (
                    <div className="mt-4">
                        <pre className="text-sm text-gray-400">└── /stats</pre>
                        <div className="p-4 border border-gray-700 rounded mt-4 bg-black text-red-400 text-sm">
                            <p>
                                <strong>Total Distance:</strong>{" "}
                                {metaStats.total_distance_km} km
                            </p>
                        </div>
                    </div>
                )}

                {error && (
                    <p className="text-sm text-red-400">⚠ Error: {error}</p>
                )}
            </div>
        </div>
    );
}
