import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useChatbot } from '../context/ChatbotContext';
import { useSpeaker, plainText } from '../hooks/useSpeaker';
import { stopSpeaking, speechSupported } from '../utils/speech';
import Icon from './Icon';
import { LISTEN, STOP } from './ListenButton';

/* ─── Demo Q&A Knowledge Base ─────────────────────────────────────── */
const FAQ = [
  {
    q: 'How do I book a Mandi slot?',
    a: 'Go to "Book a Slot" in the sidebar. Choose your crop, enter the quantity in quintals, pick a time slot, and submit. You\'ll get a token ID instantly which acts as your entry pass.',
  },
  {
    q: 'What is a token ID?',
    a: 'A Token ID (e.g. TK-001) is your unique queue number for the Mandi. Show the QR code on your dashboard at the gate for fast entry. It confirms your booking.',
  },
  {
    q: 'How do I check my queue position?',
    a: 'Visit "Queue Status" in the sidebar. You\'ll see your live position in the queue, how many farmers are ahead, and the estimated wait time.',
  },
  {
    q: 'When will I get my payment?',
    a: 'After your crop is weighed and accepted at the Mandi, payment is processed within 48–72 hours directly to your registered bank account. Track it under "Payment Status".',
  },
  {
    q: 'What crops are accepted?',
    a: 'Kisan Dwar supports all major Kharif and Rabi crops including Wheat, Paddy, Maize, Mustard, Barley, and Pulses. Availability depends on your selected Mandi centre.',
  },
  {
    q: 'My booking was moved. What happened?',
    a: 'If a Mandi centre pauses or closes, our system automatically re-books you at the nearest available centre. You\'ll see a notification on your dashboard and also receive an SMS.',
  },
  {
    q: 'What is Smart Departure Guidance?',
    a: 'Smart Departure Guidance calculates the ideal time for you to leave home based on real-time queue length, your position, and distance to the Mandi — so you don\'t wait unnecessarily at the gate.',
  },
  {
    q: 'How do I cancel my booking?',
    a: 'Open "History" from the bottom menu. Your current booking is shown on top with a "Cancel booking" button. You can cancel while your token is still waiting. If you don\'t arrive within your slot window, the booking is cancelled automatically.',
  },
  {
    q: 'What is MSP?',
    a: 'MSP (Minimum Support Price) is the government-guaranteed price for your crop. Kisan Dwar ensures all registered farmers receive at least the MSP for their produce sold at the Mandi.',
  },
  {
    q: 'How do I register on Kisan Dwar?',
    a: 'Click "Register" on the login page. You\'ll need your Aadhaar number and phone number. After login, fill in your Profile (Kisan ID, village, bank details and documents) so you can book.',
  },
  {
    q: 'What documents do I need to book?',
    keys: ['document', 'documents', 'upload', 'passbook', 'khasra', 'photo'],
    a: 'Open "Profile" and go to the Documents step. Upload your Aadhaar card and Kisan ID (needed to book). Land record, bank passbook and a passport photo are also helpful. Take a clear photo or choose a file under 1 MB.',
  },
  {
    q: 'How do I fill my profile?',
    keys: ['profile', 'kisan id', 'edit', 'details'],
    a: 'Tap your picture at the top left, or "Profile" in the bottom menu. Fill each step — Personal, Kisan & Land, Bank, Documents — then press Save. The bar at the top shows what is still missing.',
  },
];

/* ─── Fuzzy-match user input to FAQ ───────────────────────────────── */
function findAnswer(input) {
  const text = input.toLowerCase();
  const keyed = FAQ.find(({ keys }) => keys && keys.some((k) => text.includes(k)));
  if (keyed) return keyed.a;
  const match = FAQ.find(({ q }) =>
    q.toLowerCase().split(' ').some(word => word.length > 3 && text.includes(word))
  );
  return match
    ? match.a
    : 'I\'m sorry, I didn\'t quite understand that. You can choose one of the suggested questions below, or contact the Mandi helpline at 1800-XXX-XXXX for more help.';
}

/* ─── Voice input hook ────────────────────────────────────────────── */
function useSpeechRecognition(onResult) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'hi-IN';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        onResult(transcript);
        setListening(false);
      };
      recognitionRef.current.onend = () => setListening(false);
      recognitionRef.current.onerror = () => setListening(false);
    }
  }, [onResult]);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  return { listening, supported, toggle };
}

/* ─── Main Chatbot Component ──────────────────────────────────────── */
export default function FarmerChatbot() {
  const { open, setOpen } = useChatbot();
  const { lang } = useLanguage();
  const { speaking, hint, setHint, say, stop } = useSpeaker(lang);
  const windowRef = useRef(null);
  const onHome = useLocation().pathname === '/farmer'; // Home has its own "Need Help?" tile
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: 'Namaste! 🌾 I\'m KisanBot, your Kisan Dwar assistant. Ask me anything about bookings, queue, payments, or click a suggestion below!',
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  /* Stop reading when the chat closes or the language changes */
  useEffect(() => { if (!open) { stopSpeaking(); setHint(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { stop(); }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Read from the DOM so the farmer hears the translated text they see */
  const readBubble = (bubbleEl) => {
    if (speaking) { stop(); return; }
    if (bubbleEl) say(plainText(bubbleEl));
  };
  const readLatest = () => {
    const bubbles = windowRef.current?.querySelectorAll('.chatbot-bubble--bot:not(.chatbot-typing)');
    readBubble(bubbles && bubbles[bubbles.length - 1]);
  };

  /* Auto-scroll to latest message */
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  /* Focus input when chat opens */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  /* Simulate "bot is typing" delay */
  const sendMessage = (text) => {
    const userText = text.trim();
    if (!userText) return;
    setMessages((m) => [...m, { from: 'user', text: userText }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const answer = findAnswer(userText);
      setMessages((m) => [...m, { from: 'bot', text: answer }]);
      setTyping(false);
    }, 800);
  };

  const handleVoiceResult = (transcript) => {
    setInput(transcript);
    sendMessage(transcript);
  };

  const { listening, supported, toggle: toggleMic } = useSpeechRecognition(handleVoiceResult);

  const handleSubmit = (e) => {
    e?.preventDefault();
    sendMessage(input);
  };

  /* Quick-question chips (show only the first 5 for cleanliness) */
  const suggestions = FAQ.slice(0, 5).map((f) => f.q);

  return (
    <>
      {/* ── Floating Action Button ───────────────────────────── */}
      <button
        className={`chatbot-fab ${open ? 'chatbot-fab--open' : ''}${onHome ? ' chatbot-fab--home' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open KisanBot"
        title="Ask KisanBot"
      >
        {open ? '✕' : '🌾'}
        {!open && <span className="chatbot-fab-label">KisanBot</span>}
      </button>

      {/* ── Chat Window ─────────────────────────────────────── */}
      {open && (
        <div className="chatbot-window" ref={windowRef}>
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-avatar">🌾</div>
            <div>
              <div className="chatbot-header-title">KisanBot</div>
              <div className="chatbot-header-sub">
                <span className="chatbot-online-dot" />
                Kisan Dwar Assistant
              </div>
            </div>
            {speechSupported() && (
              <button
                type="button"
                className={`chatbot-listen-btn${speaking ? ' chatbot-listen-btn--on' : ''}`}
                onClick={readLatest}
                aria-label={speaking ? 'Stop reading' : 'Listen to the answer'}
                data-no-translate
              >
                <Icon name={speaking ? 'stop' : 'speaker'} size={16} />
                <span>{speaking ? (STOP[lang] || STOP.en) : (LISTEN[lang] || LISTEN.en)}</span>
              </button>
            )}
            <button
              className="chatbot-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chatbot-bubble-row ${msg.from === 'user' ? 'chatbot-bubble-row--user' : ''}`}
              >
                {msg.from === 'bot' && (
                  <div className="chatbot-bot-avatar">🌾</div>
                )}
                <div className={`chatbot-bubble ${msg.from === 'user' ? 'chatbot-bubble--user' : 'chatbot-bubble--bot'}`}>
                  {msg.text}
                </div>
                {msg.from === 'bot' && speechSupported() && (
                  <button
                    type="button"
                    className="chatbot-speak-btn"
                    onClick={(e) => readBubble(e.currentTarget.parentElement.querySelector('.chatbot-bubble'))}
                    aria-label="Listen to this message"
                    data-no-translate
                  >
                    <Icon name="speaker" size={16} />
                  </button>
                )}
              </div>
            ))}

            {hint && <div className="chatbot-hint" onClick={() => setHint('')}>{hint}</div>}

            {/* Typing indicator */}
            {typing && (
              <div className="chatbot-bubble-row">
                <div className="chatbot-bot-avatar">🌾</div>
                <div className="chatbot-bubble chatbot-bubble--bot chatbot-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}

            {/* Quick suggestions (show after bot messages) */}
            {!typing && messages[messages.length - 1]?.from === 'bot' && (
              <div className="chatbot-suggestions">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    className="chatbot-suggestion-chip"
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <form className="chatbot-input-bar" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="chatbot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              aria-label="Type your question"
            />

            {/* Mic button */}
            {supported && (
              <button
                type="button"
                className={`chatbot-icon-btn ${listening ? 'chatbot-icon-btn--listening' : ''}`}
                onClick={toggleMic}
                title={listening ? 'Stop listening' : 'Speak your question'}
                aria-label="Voice input"
              >
                🎙️
              </button>
            )}

            {/* Send button */}
            <button
              type="submit"
              className="chatbot-send-btn"
              disabled={!input.trim()}
              aria-label="Send"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
