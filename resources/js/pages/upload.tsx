import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import * as toGeoJSON from "@tmcw/togeojson";
import * as turf from "@turf/turf";
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = "pk.eyJ1IjoiZGVsYmVsIiwiYSI6ImNsaHVyYmp0NDAycDYzY254Zzl6cDhqaWYifQ.BZ91hrevKjGvhzju4p6EMA";

export default function Home() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [uuid, setUuid] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [metaStats, setMetaStats] = useState<any | null>(null);
    const [copied, setCopied] = useState(false);

    const mapContainer = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const parseGpxToGeoJson = (file: File): Promise<any> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(reader.result as string, "text/xml");
                    const converted = toGeoJSON.gpx(xml);
                    resolve(converted);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject("File reading error");
            reader.readAsText(file);
        });
    };

    const calculateStats = (geoJson: any) => {
        let totalDistance = 0;

        geoJson.features.forEach((f: any) => {
            if (f.geometry.type === "LineString") {
                const line = turf.lineString(f.geometry.coordinates);
                totalDistance += turf.length(line, { units: "kilometers" });
            }
        });

        return {
            total_distance_km: totalDistance.toFixed(2),
        };
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        try {
            const geoJson = await parseGpxToGeoJson(file);
            const stats = calculateStats(geoJson);
            geoJson.meta_stats = stats;

            const res = await fetch("/api/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ geojson: geoJson }),
            });

            if (!res.ok) throw new Error("Failed to save geojson");
            const data = await res.json();

            setUuid(data.uuid);
            setMetaStats(stats);

            if (mapRef.current) {
                if (mapRef.current.getSource("route")) {
                    (mapRef.current.getSource("route") as mapboxgl.GeoJSONSource).setData(
                        geoJson
                    );
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
            setError(err.message || "Conversion failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mapContainer.current && !mapRef.current) {
            mapRef.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: "mapbox://styles/mapbox/dark-v10",
                center: [0, 0],
                zoom: 2,
                attributionControl: true,
            });


        }
    }, []);

    const shareUrl = uuid ? `${window.location.origin}/share/${uuid}` : null;

    const handleCopy = () => {
        if (shareUrl) {
            navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-mono p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="border border-gray-700 rounded p-6 space-y-4">
                    <pre className="text-sm text-gray-400">├── /upload</pre>
                    <div className="w-full flex flex-row gap-2">
                        <input
                            type="file"
                            accept=".gpx"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-300
                file:mr-4 file:py-1 file:px-3
                file:rounded-md file:border file:border-gray-600
                file:text-sm file:font-mono
                file:bg-gray-900 file:text-blue-400
                hover:file:bg-gray-800"
                        />

                        <button
                            disabled={!file || loading}
                            onClick={handleUpload}
                            className="px-4 py-2 w-1/3 border border-gray-700 rounded
                bg-black text-white font-mono text-sm
                hover:bg-gray-900 disabled:opacity-50 transition"
                        >
                            {loading ? "Processing..." : "Convert & Save"}
                        </button>
                    </div>

                    {uuid && (
                        <div className="space-y-2">

                            {shareUrl && (
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-blue-400 underline">

                                        <a href={shareUrl} target="_blank" rel="noreferrer">
                                            {shareUrl}
                                        </a>
                                    </p>
                                    <button
                                        onClick={handleCopy}
                                        className="px-2 py-1 border border-gray-700 rounded text-xs hover:bg-gray-900"
                                    >
                                        {copied ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {error && <p className="text-sm text-red-400">⚠ {error}</p>}
                </div>

                <pre className="text-sm text-gray-400">├── /map</pre>
                <div
                    ref={mapContainer}
                    className="w-full h-[500px] border border-gray-700 rounded relative"
                ></div>

                {metaStats && (
                    <div className="mt-4">
                        <pre className="text-sm text-gray-400">└── /stats</pre>
                        <div className="p-4 border border-gray-700 rounded bg-black text-red-400 text-sm">
                            <p>
                                <strong>Total Distance:</strong> {metaStats.total_distance_km} km
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
