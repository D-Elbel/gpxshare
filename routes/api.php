<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GeoJSONController;

Route::post('/save', [GeoJSONController::class, 'saveToS3']);
Route::get('/get/{uuid}', [GeoJSONController::class, 'getGeoJSON']);
Route::get('/get-recents', [GeoJSONController::class, 'getRecents']);
