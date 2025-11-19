export const SHARED_CONSTANT = 'AstraComms';
// Add shared types here
export interface CallEvent {
  type: 'call.started' | 'call.ended';
  payload: any;
}
