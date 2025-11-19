// Simple in-memory storage for call analysis data
// In a real production app, this would be a database (Postgres/MongoDB)

let callData = {};

export const saveCallData = (callSid, data) => {
  callData[callSid] = { ...callData[callSid], ...data };
};

export const getCallData = (callSid) => {
  return callData[callSid] || {};
};

export const getAllCallData = () => {
  return callData;
};
