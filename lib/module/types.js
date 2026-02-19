"use strict";

// === ENUMS ===

export let TravelMode = /*#__PURE__*/function (TravelMode) {
  TravelMode[TravelMode["DRIVING"] = 0] = "DRIVING";
  TravelMode[TravelMode["CYCLING"] = 1] = "CYCLING";
  TravelMode[TravelMode["WALKING"] = 2] = "WALKING";
  TravelMode[TravelMode["TWO_WHEELER"] = 3] = "TWO_WHEELER";
  return TravelMode;
}({});
export let AudioGuidance = /*#__PURE__*/function (AudioGuidance) {
  AudioGuidance[AudioGuidance["SILENT"] = 0] = "SILENT";
  AudioGuidance[AudioGuidance["VOICE_ALERTS_ONLY"] = 1] = "VOICE_ALERTS_ONLY";
  AudioGuidance[AudioGuidance["VOICE_ALERTS_AND_GUIDANCE"] = 2] = "VOICE_ALERTS_AND_GUIDANCE";
  AudioGuidance[AudioGuidance["VIBRATION"] = 3] = "VIBRATION";
  return AudioGuidance;
}({});
export let NavigationState = /*#__PURE__*/function (NavigationState) {
  NavigationState["IDLE"] = "IDLE";
  NavigationState["ROUTE_REQUESTED"] = "ROUTE_REQUESTED";
  NavigationState["ROUTE_READY"] = "ROUTE_READY";
  NavigationState["NAVIGATING"] = "NAVIGATING";
  NavigationState["ARRIVED"] = "ARRIVED";
  NavigationState["ERROR"] = "ERROR";
  return NavigationState;
}({});
export let MapType = /*#__PURE__*/function (MapType) {
  MapType[MapType["NORMAL"] = 1] = "NORMAL";
  MapType[MapType["SATELLITE"] = 2] = "SATELLITE";
  MapType[MapType["TERRAIN"] = 3] = "TERRAIN";
  MapType[MapType["HYBRID"] = 4] = "HYBRID";
  return MapType;
}({});
export let CameraPerspective = /*#__PURE__*/function (CameraPerspective) {
  CameraPerspective[CameraPerspective["TILTED"] = 0] = "TILTED";
  CameraPerspective[CameraPerspective["TOP_DOWN_NORTH"] = 1] = "TOP_DOWN_NORTH";
  CameraPerspective[CameraPerspective["TOP_DOWN_HEADING"] = 2] = "TOP_DOWN_HEADING";
  return CameraPerspective;
}({});
export let MapColorScheme = /*#__PURE__*/function (MapColorScheme) {
  MapColorScheme[MapColorScheme["SYSTEM"] = 0] = "SYSTEM";
  MapColorScheme[MapColorScheme["LIGHT"] = 1] = "LIGHT";
  MapColorScheme[MapColorScheme["DARK"] = 2] = "DARK";
  return MapColorScheme;
}({});

// === CORE TYPES ===

// === THEME TYPES ===

// === EVENT PAYLOAD TYPES ===

// === BACKGROUND LOCATION ===

// === OTP Delivery Verification ===
//# sourceMappingURL=types.js.map