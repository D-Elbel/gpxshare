<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class GeoJSONController extends Controller
{
    public function saveToS3(Request $request): \Illuminate\Http\JsonResponse
    {

        $uuid = Str::uuid()->toString();
        Storage::disk('s3')->put("$uuid.json", $request->input('geojson'));

        return response()->json(["message" => "success"], 200);
    }
}
