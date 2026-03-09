import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

function pickArray(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.occupations)) return json.occupations;
  if (Array.isArray(json?.exam_sessions)) return json.exam_sessions;
  if (Array.isArray(json?.available_dates)) return json.available_dates;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.occupations)) return json.data.occupations;
  if (Array.isArray(json?.data?.exam_sessions)) return json.data.exam_sessions;
  if (Array.isArray(json?.data?.available_dates)) return json.data.available_dates;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.results)) return json.results;
  return [];
}

export default function CreateBookingModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [categoryId, setCategoryId] = useState("56");
  const [occupationId, setOccupationId] = useState("");
  const [city, setCity] = useState("");
  const [examDate, setExamDate] = useState(""); // YYYY-MM-DD
  const [sessionId, setSessionId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [siteCity, setSiteCity] = useState("");
  const [languageCode, setLanguageCode] = useState("MTDBB");
  const [methodology, setMethodology] = useState("in_person");

  const [occupations, setOccupations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [hold, setHold] = useState(null);
  const [reservation, setReservation] = useState(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        setMsg("Loading occupations...");
        const res = await api("/api/svp/occupations");
        const list = pickArray(res);
        setOccupations(list);
        if (!occupationId && list?.[0]?.id) setOccupationId(String(list[0].id));
        setMsg("");
      } catch (e) {
        setMsg(JSON.stringify(e.data || e.message));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sessionList = useMemo(() => sessions || [], [sessions]);
  const cities = useMemo(() => uniq(sessionList.map((s) => s.city)), [sessionList]);
  const selectedOccupation = useMemo(
    () => occupations.find((o) => String(o?.id) === String(occupationId)) || null,
    [occupations, occupationId]
  );
  const selectedSession = useMemo(
    () => sessionList.find((s) => String(s?.id || s?.exam_session_id) === String(sessionId)) || null,
    [sessionList, sessionId]
  );

  useEffect(() => {
    if (!selectedOccupation) return;
    const cid = selectedOccupation?.category_id || selectedOccupation?.category?.id;
    if (cid) setCategoryId(String(cid));
    const codes = (selectedOccupation?.category?.prometric_codes || []).map((p) => p?.code).filter(Boolean);
    if (codes.length && !codes.includes(languageCode)) setLanguageCode(codes[0]);
  }, [selectedOccupation, languageCode]);

  useEffect(() => {
    if (!selectedSession) return;
    const sid = selectedSession?.site_id ?? selectedSession?.test_center_id ?? selectedSession?.site?.id;
    const scity =
      selectedSession?.site_city ??
      selectedSession?.city ??
      selectedSession?.site_city_name ??
      selectedSession?.test_center_city ??
      "";
    setSiteId(sid == null ? "" : String(sid));
    setSiteCity(String(scity || ""));
    if (!city && selectedSession?.city) setCity(selectedSession.city);
  }, [selectedSession, city]);

  async function loadSessions() {
    if (!city || !examDate) return setMsg("Select city and date first.");
    try {
      setLoading(true);
      setMsg("Loading sessions...");
      const qs = new URLSearchParams({
        category_id: categoryId,
        city,
        exam_date: examDate,
      }).toString();

      const res = await api(`/api/svp/exam-sessions?${qs}`);
      const list = pickArray(res);
      setSessions(list);
      if (list?.[0]?.id || list?.[0]?.exam_session_id) {
        setSessionId(String(list[0]?.id || list[0]?.exam_session_id));
      }
      setMsg("");
    } catch (e) {
      setMsg(JSON.stringify(e.data || e.message));
    } finally {
      setLoading(false);
    }
  }

  async function createHold() {
    if (!sessionId) return setMsg("Select a session first.");
    try {
      setLoading(true);
      setMsg("Creating hold (temporary seat)...");
      const res = await api("/api/svp/temporary-seats", {
        method: "POST",
        body: { exam_session_id: [Number(sessionId)], methodology },
      });
      setHold(res);
      setMsg("Hold created.");
    } catch (e) {
      setMsg(JSON.stringify(e.data || e.message));
    } finally {
      setLoading(false);
    }
  }

  function extractHoldId(x) {
    return x?.hold_id || x?.id || x?.data?.hold_id || x?.data?.id || null;
  }

  async function book() {
    if (!sessionId) return setMsg("Select a session first.");
    if (!occupationId) return setMsg("Select occupation.");
    try {
      setLoading(true);
      setMsg("Booking reservation...");
      const holdId = hold ? extractHoldId(hold) : null;

      const res = await api("/api/svp/exam-reservations", {
        method: "POST",
        body: {
          exam_session_id: Number(sessionId),
          occupation_id: Number(occupationId),
          language_code: languageCode,
          site_id: siteId ? Number(siteId) : null,
          site_city: siteCity || city || null,
          hold_id: holdId,
          methodology,
        },
      });

      setReservation(res);
      setMsg("Booked ✅");
    } catch (e) {
      setMsg(JSON.stringify(e.data || e.message));
    } finally {
      setLoading(false);
    }
  }

  function resetAndClose() {
    setMsg("");
    setHold(null);
    setReservation(null);
    onClose?.();
  }

  if (!open) return null;

  return (
    <div style={styles.backdrop} onMouseDown={resetAndClose}>
      <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>Create New Booking</h3>
          <button onClick={resetAndClose} style={styles.closeBtn} aria-label="Close">×</button>
        </div>

        <div style={styles.body}>
          <label>PACC Credential *</label>
          <div style={styles.fakeSelect}>Using current logged-in SVP session</div>

          <label>Occupation *</label>
          <select value={occupationId} onChange={(e) => setOccupationId(e.target.value)}>
            {occupations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name ? `${o.name}` : `Occupation #${o.id}`} (#{o.id})
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>City *</label>
              <input placeholder="Rajshahi" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Available Date *</label>
              <input placeholder="YYYY-MM-DD" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>Category Id</label>
              <input value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Methodology</label>
              <select value={methodology} onChange={(e) => setMethodology(e.target.value)}>
                <option value="in_person">in_person</option>
                <option value="remote">remote</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>site_id (auto)</label>
              <input value={siteId} onChange={(e) => setSiteId(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label>site_city (auto)</label>
              <input value={siteCity} onChange={(e) => setSiteCity(e.target.value)} />
            </div>
          </div>

          <button onClick={loadSessions} disabled={loading}>Load Test Sessions</button>

          <label>Test Center / Session *</label>
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            {sessionList.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.id} {s.test_center_name ? `- ${s.test_center_name}` : ""} {s.start_at ? `- ${s.start_at}` : ""}
              </option>
            ))}
          </select>

          <label>Language Code</label>
          <input value={languageCode} onChange={(e) => setLanguageCode(e.target.value)} />

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button onClick={createHold} disabled={loading} style={{ flex: 1 }}>Create Hold</button>
            <button onClick={book} disabled={loading} style={{ flex: 1 }}>Book</button>
          </div>

          {msg && <div style={styles.msg}><pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg}</pre></div>}
          {reservation && (
            <div style={styles.msg}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Reservation Response</div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(reservation, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 50,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    background: "#0b1220",
    color: "white",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.10)",
    boxShadow: "0 10px 40px rgba(0,0,0,.5)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottom: "1px solid rgba(255,255,255,.10)",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "white",
    fontSize: 22,
    cursor: "pointer",
    lineHeight: 1,
  },
  body: {
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  fakeSelect: {
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.10)",
  },
  msg: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.10)",
  },
};
