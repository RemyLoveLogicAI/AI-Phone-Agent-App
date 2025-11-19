import { saveCallData } from '../../../lib/storage';

export default function handler(req, res) {
  const callSid = req.body.CallSid;
  const recordingUrl = req.body.RecordingUrl;
  const transcriptionText = req.body.TranscriptionText;

  if (recordingUrl) {
    saveCallData(callSid, {
      recordingUrl: recordingUrl,
      recordingDuration: req.body.RecordingDuration
    });
  }

  if (transcriptionText) {
    saveCallData(callSid, {
      transcription: transcriptionText
    });
  }

  res.status(200).end();
}
