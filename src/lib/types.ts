export type MessageType =
  | "SPEAK_TEXT"
  | "STOP_SPEECH"
  | "PAUSE_SPEECH"
  | "RESUME_SPEECH"
  | "GET_SPEECH_STATE"
  | "SAVE_SETTINGS"
  | "SPEECH_STARTED"
  | "SPEECH_ENDED"
  | "SPEECH_STOPPED"
  | "SPEECH_PAUSED"
  | "SPEECH_RESUMED"
  | "SPEECH_ERROR"
  | "UPDATE_SPEECH_STATE"
  | "PING";

export interface Message {
  type: MessageType;
  payload?: any;
  tabId?: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
}

export interface TTSSettings {
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  lang: string;
}
