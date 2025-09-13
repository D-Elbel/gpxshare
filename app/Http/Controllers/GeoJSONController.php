<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class GeoJSONController extends Controller
{
    public function saveToS3(Request $request)
    {
        try {
            $geojson = $request->input('geojson');

            if (!$geojson) {
                return response()->json([
                    "error" => "Missing geojson payload"
                ], 400);
            }

            $uuid = Str::uuid()->toString();
            Storage::disk('s3')->put("files/$uuid.json", json_encode($geojson));

            return response()->json(["uuid" => $uuid], 200);
        } catch (\Exception $e) {
            Log::error("GeoJSON save failed: " . $e->getMessage(), ["exception" => $e]);
            return response()->json([
                "error" => "Failed to save GeoJSON"
            ], 500);
        }
    }

    public function getGeoJSON(Request $request)
    {
        $uuid = $request->route("uuid");
        $geoJSON = Storage::disk('s3')->get("files/$uuid.json");
        return response($geoJSON, 200);
    }
}
