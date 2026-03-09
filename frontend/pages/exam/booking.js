import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

function pickArray(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.results)) return json.results;
  return null;
}

export default function ExamBooking() {
  const [out, setOut] = useState("");
  const [step, setStep] = useState("search");

  // Search inputs (available dates)
  const [categoryId, setCategoryId] = useState("56");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [perPage, setPerPage] = useState("1000");
  const [availableSeats, setAvailableSeats] = useState("greater_than::0");
  const [status, setStatus] = useState("scheduled");

  // Sessions filter
  const [city, setCity] = useState("Mymensingh");
  const [examDate, setExamDate] = useState("");

  // Booking inputs
  const [occupationId, setOccupationId] = useState("");
  const [languageCode, setLanguageCode] = useState("MTDBB");
  const [methodology, setMethodology] = useState("in_person");

  // Data
  const [availableDatesRaw, setAvailableDatesRaw] = useState(null);
  const [sessionsRaw, setSessionsRaw] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [holdRaw, setHoldRaw] = useState(null);
  const [reservationRaw, setReservationRaw] = useState(null);

  // Occupations (optional helper)
  const [occupationsRaw, setOccupationsRaw] = useState(null);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!t) window.location.href = "/auth/login";
  }, []);

  async function loadOccupations() {
    setOut("Loading occupations...");
    try {
      const res = await api("/api/svp/occupations");
      setOccupationsRaw(res);
      setOut(JSON.stringify(res, null, 2));
      const arr = pickArray(res);
      // try to prefill occupation_id from the first item
      if (!occupationId && arr?.[0]?.id) setOccupationId(String(arr[0].id));
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    }
  }

  async function searchAvailableDates(e) {
    e?.preventDefault?.();
    setOut("Searching available dates...");
    setStep("search");

    // Default start date = today if empty
    const sd = startDateFrom || new Date().toISOString().slice(0, 10);

    const qs = new URLSearchParams({
      per_page: perPage,
      category_id: categoryId,
      start_at_date_from: sd,
      available_seats: availableSeats,
      status,
    }).toString();

    try {
      const res = await api(`/api/svp/available-dates?${qs}`);
      setAvailableDatesRaw(res);
      setOut(JSON.stringify(res, null, 2));

      // Try to auto-pick a date from response
      const arr = pickArray(res);
      const maybeDate =
        (arr?.[0]?.date || arr?.[0]?.exam_date || arr?.[0]?.day || arr?.[0]) ?? "";
      if (typeof maybeDate === "string" && maybeDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        setExamDate(maybeDate);
      }
      setStep("dates");
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    }
  }

  async function loadExamSessions(e) {
    e?.preventDefault?.();
    setOut("Loading exam sessions...");
    setStep("sessions");

    const qs = new URLSearchParams({
      category_id: categoryId,
      city,
      exam_date: examDate,
    }).toString();

    try {
      const res = await api(`/api/svp/exam-sessions?${qs}`);
      setSessionsRaw(res);
      setOut(JSON.stringify(res, null, 2));

      // Try to auto-pick first session id
      const arr = pickArray(res);
      const firstId = arr?.[0]?.id || arr?.[0]?.exam_session_id;
      if (firstId) setSelectedSessionId(String(firstId));
      setStep("sessions");
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    }
  }

  async function createHold() {
    if (!selectedSessionId) return setOut("Select an exam session first.");

    setOut("Creating temporary seat (hold)...");
    setStep("hold");

    // From Postman example: {"exam_session_id":[1199247],"methodology":"in_person"}
    try {
      const res = await api("/api/svp/temporary-seats", {
        method: "POST",
        body: { exam_session_id: [Number(selectedSessionId)], methodology },
      });
      setHoldRaw(res);
      setOut(JSON.stringify(res, null, 2));
      setStep("hold");
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    }
  }

  function extractHoldId(json) {
    // Try common shapes
    return (
      json?.hold_id ||
      json?.id ||
      json?.data?.hold_id ||
      json?.data?.id ||
      null
    );
  }

  async function bookReservation() {
    if (!selectedSessionId) return setOut("Select an exam session first.");
    if (!occupationId) return setOut("occupation_id is required (pick from occupations).");

    setOut("Booking exam reservation...");
    setStep("book");

    const holdId = holdRaw ? extractHoldId(holdRaw) : null;

    // From Postman example:
    // {"exam_session_id":1055182,"occupation_id":2023,"language_code":"MTDBB","site_id":null,"site_city":null,"hold_id":null,"methodology":"in_person"}
    const body = {
      exam_session_id: Number(selectedSessionId),
      occupation_id: Number(occupationId),
      language_code: languageCode,
      site_id: null,
      site_city: null,
      hold_id: holdId,
      methodology,
    };

    try {
      const res = await api("/api/svp/exam-reservations", { method: "POST", body });
      setReservationRaw(res);
      setOut(JSON.stringify(res, null, 2));
      setStep("booked");
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    }
  }

  const sessionList = useMemo(() => pickArray(sessionsRaw) || [], [sessionsRaw]);
  const occList = useMemo(() => pickArray(occupationsRaw) || [], [occupationsRaw]);

  return (
    <div className="container">
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Exam Search + Booking</h2>
        <Link href="/dashboard">Back</Link>
      </div>

      <div className="card">
        <h3>1) Search Available Dates</h3>
        <form onSubmit={searchAvailableDates}>
          <div className="row">
            <div>
              <label>category_id</label>
              <input value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
            </div>
            <div>
              <label>start_at_date_from (YYYY-MM-DD)</label>
              <input value={startDateFrom} onChange={(e) => setStartDateFrom(e.target.value)} placeholder="auto = today" />
            </div>
          </div>

          <div className="row">
            <div>
              <label>per_page</label>
              <input value={perPage} onChange={(e) => setPerPage(e.target.value)} />
            </div>
            <div>
              <label>available_seats</label>
              <input value={availableSeats} onChange={(e) => setAvailableSeats(e.target.value)} />
            </div>
            <div>
              <label>status</label>
              <input value={status} onChange={(e) => setStatus(e.target.value)} />
            </div>
          </div>

          <button type="submit">Search Dates</button>
          <p className="small">
            API: <code>/api/svp/available-dates</code> (query passthrough)
          </p>
        </form>
      </div>

      <div className="card">
        <h3>2) Load Sessions (by date + city)</h3>
        <div className="row">
          <div>
            <label>city</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label>exam_date</label>
            <input value={examDate} onChange={(e) => setExamDate(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
        </div>
        <button onClick={loadExamSessions}>Load Sessions</button>
        <p className="small">
          API: <code>/api/svp/exam-sessions</code> (query passthrough)
        </p>

        {sessionList.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <label>Pick exam_session_id</label>
            <select value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)}>
              {sessionList.map((s) => (
                <option key={s.id || s.exam_session_id} value={s.id || s.exam_session_id}>
                  #{s.id || s.exam_session_id} {s.city ? `- ${s.city}` : ""}{" "}
                  {s.start_at ? `- ${s.start_at}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="card">
        <h3>3) Booking</h3>

        <div className="row">
          <div>
            <label>methodology</label>
            <select value={methodology} onChange={(e) => setMethodology(e.target.value)}>
              <option value="in_person">in_person</option>
              <option value="remote">remote</option>
            </select>
          </div>
          <div>
            <label>language_code</label>
            <input value={languageCode} onChange={(e) => setLanguageCode(e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div>
            <label>occupation_id</label>
            <input value={occupationId} onChange={(e) => setOccupationId(e.target.value)} placeholder="ex: 2023" />
            <button style={{ marginTop: 8 }} onClick={loadOccupations} type="button">
              Load occupations helper
            </button>
            {occList.length > 0 && (
              <select value={occupationId} onChange={(e) => setOccupationId(e.target.value)} style={{ marginTop: 8 }}>
                {occList.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id} {o.name ? `- ${o.name}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label>Selected exam_session_id</label>
            <input value={selectedSessionId} readOnly />
            <p className="small">Temporary seat (hold) is optional, but recommended.</p>
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={createHold} type="button">Create temporary seat (hold)</button>
          <button onClick={bookReservation} type="button">Book reservation</button>
        </div>

        <p className="small">
          POST <code>/api/svp/temporary-seats</code> uses body like
          <code>{"{"}"exam_session_id":[ID],"methodology":"in_person"{"}"}</code>.{" "}
          POST <code>/api/svp/exam-reservations</code> uses body like
          <code>{"{"}"exam_session_id":ID,"occupation_id":2023,"language_code":"MTDBB","site_id":null,"site_city":null,"hold_id":null,"methodology":"in_person"{"}"}</code>.
        </p>
      </div>

      <div className="card">
        <h3>Output (raw)</h3>
        <pre>{out}</pre>
      </div>
    </div>
  );
}
