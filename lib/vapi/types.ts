// Vapi.ai Types

export interface VapiCallRequest {
  assistantId?: string;
  assistant?: VapiAssistant;
  assistantOverrides?: Partial<VapiAssistant>;
  phoneNumberId: string;
  customer: {
    number: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface VapiAssistant {
  name?: string;
  model: {
    provider: 'openai' | 'anthropic' | 'together-ai' | 'groq';
    model: string;
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
    temperature?: number;
  };
  voice: {
    provider: 'elevenlabs' | '11labs' | 'playht' | 'deepgram' | 'openai';
    voiceId: string;
  };
  firstMessage?: string;
  endCallMessage?: string;
  transcriber?: {
    provider: 'deepgram' | 'talkscriber';
    model?: string;
    language?: string;
  };
  analysisPlan?: {
    summaryPrompt?: string;
    summaryRequestTimeoutSeconds?: number;
    structuredDataPrompt?: string;
    structuredDataSchema?: Record<string, unknown>;
    successEvaluationPrompt?: string;
    successEvaluationRubric?: 'NumericScale' | 'DescriptiveScale' | 'Checklist' | 'Matrix' | 'PercentageScale' | 'LikertScale' | 'AutomaticRubric' | 'PassFail';
  };
  endCallPhrases?: string[];
  silenceTimeoutSeconds?: number;
  maxDurationSeconds?: number;
}

export interface VapiCall {
  id: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
  type: 'inboundPhoneCall' | 'outboundPhoneCall' | 'webCall';
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended';
  endedReason?: string;
  phoneNumberId?: string;
  customer?: {
    number: string;
    name?: string;
  };
  assistant?: VapiAssistant;
  assistantId?: string;
  transcript?: string;
  recordingUrl?: string;
  summary?: string;
  messages?: VapiMessage[];
  metadata?: Record<string, unknown>;
  cost?: number;
  costBreakdown?: {
    transport?: number;
    stt?: number;
    llm?: number;
    tts?: number;
    vapi?: number;
  };
}

export interface VapiMessage {
  role: 'user' | 'assistant' | 'system' | 'function_call' | 'function_result';
  message?: string;
  time: number;
  secondsFromStart: number;
  endTime?: number;
}

export interface VapiWebhookPayload {
  message: {
    type: 'status-update' | 'end-of-call-report' | 'hang' | 'transcript' | 'function-call' | 'speech-update';
    call?: VapiCall;
    status?: string;
    endedReason?: string;
    transcript?: string;
    summary?: string;
    recordingUrl?: string;
    messages?: VapiMessage[];
    // Artifact contains structured outputs, recordings, etc.
    artifact?: {
      structuredOutputs?: Record<string, {
        name?: string;
        result?: Record<string, unknown>;
      }>;
      transcript?: string;
      recordingUrl?: string;
      stereoRecordingUrl?: string;
      messages?: VapiMessage[];
      [key: string]: unknown;
    };
    analysis?: {
      summary?: string;
      successEvaluation?: string;
    };
  };
}

export interface ScheduledCall {
  id: string;
  leadId: string;
  phoneNumber: string;
  customerName: string;
  scheduledFor: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  callId?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  result?: {
    duration?: number;
    transcript?: string;
    summary?: string;
    recordingUrl?: string;
    outcome?: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'failed';
  };
}
