import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

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

function uniqueBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr || []) {
    const key = keyFn(item);
    if (key == null || key === "") continue;
    if (!map.has(key)) map.set(key, item);
  }
  return Array.from(map.values());
}

function normalizeOccupation(o) {
  const categoryId = o?.category_id ?? o?.category?.id ?? "";
  const languageCodes = (o?.category?.prometric_codes || [])
    .map((p) => p?.code)
    .filter(Boolean);
  return {
    id: o?.id,
    name: o?.name || o?.english_name || o?.arabic_name || `Occupation #${o?.id}`,
    categoryId: String(categoryId || ""),
    categoryName: o?.category_name_en || o?.category?.english_name || o?.category_name_ar || o?.category?.arabic_name || "",
    languageCodes,
    raw: o,
  };
}

function normalizeDateItem(item) {
  const date = item?.exam_date || item?.date || item?.day || item?.start_at_date || "";
  if (typeof date !== "string" || !date.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
  return date;
}

function normalizeSession(s) {
  const id = s?.id || s?.exam_session_id || null;
  const cityName =
    s?.city ||
    s?.site_city_name ||
    s?.test_center_city ||
    s?.site_city?.name ||
    "";
  const cityId =
    s?.city_id ??
    s?.site_city_id ??
    s?.site_city?.id ??
    null;
  const siteId =
    s?.site_id ??
    s?.test_center_id ??
    s?.site?.id ??
    null;
  const startAt = s?.start_at || s?.start_time || "";
  const testCenterName = s?.test_center_name || s?.site_name || s?.site?.name || "";
  return {
    id: id ? String(id) : "",
    cityName: String(cityName || ""),
    cityId: cityId == null ? "" : String(cityId),
    siteId: siteId == null ? "" : String(siteId),
    startAt: String(startAt || ""),
    testCenterName: String(testCenterName || ""),
    raw: s,
  };
}

export default function ExamBooking() {
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  const [categoryId, setCategoryId] = useState("56");
  const [occupationPerPage, setOccupationPerPage] = useState("194");
  const [occupationPage, setOccupationPage] = useState("1");
  const [occupationName, setOccupationName] = useState("");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [perPage, setPerPage] = useState("1000");
  const [availableSeats, setAvailableSeats] = useState("greater_than::0");
  const [status, setStatus] = useState("scheduled");

  const [occupationId, setOccupationId] = useState("");
  const [city, setCity] = useState("");
  const [cityId, setCityId] = useState("");
  const [examDate, setExamDate] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [siteCity, setSiteCity] = useState("");
  const [languageCode, setLanguageCode] = useState("MTDBB");
  const [methodology, setMethodology] = useState("in_person");

  const [availableDatesRaw, setAvailableDatesRaw] = useState(null);
  const [occupationsRaw, setOccupationsRaw] = useState(null);
  const [sessionsRaw, setSessionsRaw] = useState(null);
  const [holdRaw, setHoldRaw] = useState(null);
  const [reservationRaw, setReservationRaw] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [payableType, setPayableType] = useState("Reservation");
  const [payableId, setPayableId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [paymentRaw, setPaymentRaw] = useState(null);
  const [paymentStatusRaw, setPaymentStatusRaw] = useState(null);
  const [paymentFinalizeRaw, setPaymentFinalizeRaw] = useState(null);
  const [paymentValidateRaw, setPaymentValidateRaw] = useState(null);

  const occList = useMemo(() => pickArray(occupationsRaw).map(normalizeOccupation).filter((o) => o.id), [occupationsRaw]);
  const dateList = useMemo(() => uniqueBy(pickArray(availableDatesRaw).map(normalizeDateItem).filter(Boolean), (d) => d), [availableDatesRaw]);
  const sessionList = useMemo(() => pickArray(sessionsRaw).map(normalizeSession).filter((s) => s.id), [sessionsRaw]);
  const cityOptions = useMemo(() => uniqueBy(sessionList, (s) => `${s.cityName}::${s.cityId}`), [sessionList]);

  const selectedOccupation = useMemo(
    () => occList.find((o) => String(o.id) === String(occupationId)) || null,
    [occList, occupationId]
  );
  const selectedSession = useMemo(
    () => sessionList.find((s) => String(s.id) === String(selectedSessionId)) || null,
    [sessionList, selectedSessionId]
  );

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!t) {
      window.location.href = "/auth/login";
      return;
    }
    loadOccupations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedOccupation) return;
    if (selectedOccupation.categoryId && selectedOccupation.categoryId !== categoryId) {
      setCategoryId(selectedOccupation.categoryId);
    }
    if (selectedOccupation.languageCodes.length > 0 && !selectedOccupation.languageCodes.includes(languageCode)) {
      setLanguageCode(selectedOccupation.languageCodes[0]);
    }
  }, [selectedOccupation, categoryId, languageCode]);

  useEffect(() => {
    if (!selectedSession) return;
    setSiteId(selectedSession.siteId || "");
    setSiteCity(selectedSession.cityName || "");
    setCity(selectedSession.cityName || city);
    setCityId(selectedSession.cityId || "");
  }, [selectedSession, city]);

  async function loadOccupations() {
    setLoading(true);
    setOut("Loading occupations...");
    try {
      const qs = new URLSearchParams({
        per_page: occupationPerPage,
        page: occupationPage,
        name: occupationName,
      }).toString();
      const res = await api(`/api/svp/occupations?${qs}`);
      setOccupationsRaw(res);
      const list = pickArray(res).map(normalizeOccupation).filter((o) => o.id);
      if (!occupationId && list[0]?.id) setOccupationId(String(list[0].id));
      setOut(JSON.stringify(res, null, 2));
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    } finally {
      setLoading(false);
    }
  }

  async function searchAvailableDates(e) {
    e?.preventDefault?.();
    setLoading(true);
    setOut("Searching available dates...");
    const sd = startDateFrom || new Date().toISOString().slice(0, 10);
    try {
      const qs = new URLSearchParams({
        per_page: perPage,
        category_id: categoryId,
        start_at_date_from: sd,
        available_seats: availableSeats,
        status,
      }).toString();

      const res = await api(`/api/svp/available-dates?${qs}`);
      setAvailableDatesRaw(res);

      const dates = uniqueBy(pickArray(res).map(normalizeDateItem).filter(Boolean), (d) => d);
      if (!examDate && dates[0]) setExamDate(dates[0]);
      setOut(JSON.stringify(res, null, 2));
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    } finally {
      setLoading(false);
    }
  }

  const loadExamSessions = useCallback(async (e) => {
    e?.preventDefault?.();
    if (!examDate) return setOut("Select exam date first.");
    setLoading(true);
    setOut("Loading exam sessions...");

    // Try with selected city first (if available), then fallback without city.
    const attempts = city ? [city, ""] : ["", city];
    let lastErr = null;
    let pickedRes = null;
    let pickedList = [];

    try {
      for (const cityAttempt of attempts) {
        const query = {
          category_id: categoryId,
          exam_date: examDate,
        };
        if (cityAttempt) query.city = cityAttempt;

        try {
          const qs = new URLSearchParams(query).toString();
          const res = await api(`/api/svp/exam-sessions?${qs}`);
          const list = pickArray(res).map(normalizeSession).filter((s) => s.id);

          if (list.length > 0) {
            pickedRes = res;
            pickedList = list;
            break;
          }

          // Keep the first successful empty response in case nothing else returns rows.
          if (!pickedRes) {
            pickedRes = res;
            pickedList = list;
          }
        } catch (err) {
          lastErr = err;
        }
      }

      if (!pickedRes && lastErr) throw lastErr;
      if (!pickedRes) {
        setSessionsRaw(null);
        setOut("No sessions response from API.");
        return;
      }

      setSessionsRaw(pickedRes);
      if (pickedList[0]) {
        const first = pickedList[0];
        setSelectedSessionId(first.id);
        if (!city && first.cityName) setCity(first.cityName);
        if (!cityId && first.cityId) setCityId(first.cityId);
      }

      if (pickedList.length === 0) {
        setOut("No sessions found for selected date/category. Try another date or city.");
      } else {
        setOut(JSON.stringify(pickedRes, null, 2));
      }
    } catch (err) {
      setOut(JSON.stringify(err.data || err.message, null, 2));
    } finally {
      setLoading(false);
    }
  }, [categoryId, city, cityId, examDate]);

  async function createHold() {
    if (!selectedSessionId) return setOut("Select exam session first.");
    setLoading(true);
    setOut("Creating temporary seat (hold)...");
    try {
      const res = await api("/api/svp/temporary-seats", {
        method: "POST",
        body: { exam_session_id: [Number(selectedSessionId)], methodology },
      });
      setHoldRaw(res);
      setOut(JSON.stringify(res, null, 2));
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    } finally {
      setLoading(false);
    }
  }

  function extractHoldId(json) {
    return json?.hold_id || json?.id || json?.data?.hold_id || json?.data?.id || null;
  }

  function extractReservationId(json) {
    return (
      json?.reservation?.id ||
      json?.reservation_id ||
      json?.id ||
      json?.data?.reservation?.id ||
      json?.data?.reservation_id ||
      json?.data?.id ||
      null
    );
  }

  function extractPaymentId(json) {
    return (
      json?.payment?.id ||
      json?.payment_id ||
      json?.id ||
      json?.data?.payment?.id ||
      json?.data?.payment_id ||
      json?.data?.id ||
      null
    );
  }

  async function bookReservation() {
    if (!selectedSessionId) return setOut("Select exam session first.");
    if (!occupationId) return setOut("Select occupation first.");

    const holdId = holdRaw ? extractHoldId(holdRaw) : null;
    const payloadSiteId = siteId ? Number(siteId) : null;
    const payloadSiteCity = siteCity || city || null;

    const body = {
      exam_session_id: Number(selectedSessionId),
      occupation_id: Number(occupationId),
      language_code: languageCode,
      site_id: payloadSiteId,
      site_city: payloadSiteCity,
      hold_id: holdId,
      methodology,
    };

    setLoading(true);
    setOut("Booking exam reservation...");
    try {
      const res = await api("/api/svp/exam-reservations", { method: "POST", body });
      setReservationRaw(res);
      const rid = extractReservationId(res);
      if (rid) setPayableId(String(rid));
      setOut(JSON.stringify(res, null, 2));
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    } finally {
      setLoading(false);
    }
  }

  async function createPayment() {
    if (!payableId) return setOut("Reservation ID (payable_id) required for payment.");
    setLoading(true);
    setOut("Creating payment...");
    try {
      const body = {
        payment: {
          payment_method: paymentMethod,
          payable_type: payableType,
          payable_id: Number(payableId),
        },
      };
      const res = await api("/api/svp/payments", { method: "POST", body });
      setPaymentRaw(res);
      const pid = extractPaymentId(res);
      if (pid) setPaymentId(String(pid));
      setOut(JSON.stringify(res, null, 2));
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    } finally {
      setLoading(false);
    }
  }

  async function fetchPaymentStatus() {
    if (!paymentId) return setOut("Payment ID required.");
    setLoading(true);
    setOut("Loading payment status...");
    try {
      const res = await api(`/api/svp/payments/${encodeURIComponent(paymentId)}`);
      setPaymentStatusRaw(res);
      setOut(JSON.stringify(res, null, 2));
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    } finally {
      setLoading(false);
    }
  }

  async function finalizePayment() {
    if (!paymentId) return setOut("Payment ID required.");
    setLoading(true);
    setOut("Finalizing payment...");
    try {
      const res = await api(`/api/svp/payments/${encodeURIComponent(paymentId)}`, { method: "PUT" });
      setPaymentFinalizeRaw(res);
      setOut(JSON.stringify(res, null, 2));
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    } finally {
      setLoading(false);
    }
  }

  async function validatePendingPayments() {
    setLoading(true);
    setOut("Validating pending payments...");
    try {
      const res = await api("/api/svp/payments-validate-pending");
      setPaymentValidateRaw(res);
      setOut(JSON.stringify(res, null, 2));
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    } finally {
      setLoading(false);
    }
  }

  // Auto-load sessions as soon as date/category is ready.
  useEffect(() => {
    if (!occupationId || !categoryId || !examDate) return;
    loadExamSessions();
  }, [occupationId, categoryId, examDate, loadExamSessions]);

  return (
    <div className="container">
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Full Booking (Live API)</h2>
        <Link href="/dashboard">Back</Link>
      </div>

      <div className="card">
        <h3>1) Occupation + Category</h3>
        <div className="row">
          <div>
            <label>occupation per_page</label>
            <input value={occupationPerPage} onChange={(e) => setOccupationPerPage(e.target.value)} />
          </div>
          <div>
            <label>occupation page</label>
            <input value={occupationPage} onChange={(e) => setOccupationPage(e.target.value)} />
          </div>
          <div>
            <label>occupation name</label>
            <input value={occupationName} onChange={(e) => setOccupationName(e.target.value)} />
          </div>
        </div>
        <div className="row">
          <div>
            <label>Occupation</label>
            <select value={occupationId} onChange={(e) => setOccupationId(e.target.value)}>
              {occList.map((o) => (
                <option key={o.id} value={o.id}>
                  #{o.id} - {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Category (auto from occupation)</label>
            <input value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
            {selectedOccupation?.categoryName ? <p className="small">{selectedOccupation.categoryName}</p> : null}
          </div>
        </div>
        <button type="button" onClick={loadOccupations} disabled={loading}>Reload Occupations</button>
        <p className="small">
          API: <code>/api/svp/occupations?per_page={occupationPerPage || "194"}&page={occupationPage || "1"}&name={occupationName || ""}</code>
        </p>
      </div>

      <div className="card">
        <h3>2) Available Dates</h3>
        <form onSubmit={searchAvailableDates}>
          <div className="row">
            <div>
              <label>start_at_date_from (YYYY-MM-DD)</label>
              <input type="date" value={startDateFrom} onChange={(e) => setStartDateFrom(e.target.value)} placeholder="auto = today" />
            </div>
            <div>
              <label>per_page</label>
              <input value={perPage} onChange={(e) => setPerPage(e.target.value)} />
            </div>
          </div>

          <div className="row">
            <div>
              <label>available_seats</label>
              <input value={availableSeats} onChange={(e) => setAvailableSeats(e.target.value)} />
            </div>
            <div>
              <label>status</label>
              <input value={status} onChange={(e) => setStatus(e.target.value)} />
            </div>
          </div>
          <button type="submit" disabled={loading}>Search Dates</button>
        </form>

        {dateList.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            <label>Exam Date</label>
            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            <select value={examDate} onChange={(e) => setExamDate(e.target.value)} style={{ marginTop: 8 }}>
              <option value="">Choose available date</option>
              {dateList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h3>3) City + Sessions</h3>
        <div className="row">
          <div>
            <label>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mymensingh" />
          </div>
          <div>
            <label>City ID (auto)</label>
            <input value={cityId} readOnly />
          </div>
        </div>
        {cityOptions.length > 0 ? (
          <div style={{ marginTop: 8 }}>
            <label>Detected Cities From Sessions</label>
            <select
              value={`${city}::${cityId}`}
              onChange={(e) => {
                const [name, id] = e.target.value.split("::");
                setCity(name || "");
                setCityId(id || "");
              }}
            >
              {cityOptions.map((c) => (
                <option key={`${c.cityName}::${c.cityId}`} value={`${c.cityName}::${c.cityId}`}>
                  {c.cityName || "Unknown city"} {c.cityId ? `(city_id: ${c.cityId})` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <button onClick={loadExamSessions} type="button" disabled={loading}>Load Sessions</button>

        {sessionList.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <label>Session</label>
            <select value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)}>
              {sessionList.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} {s.cityName ? `- ${s.cityName}` : ""} {s.testCenterName ? `- ${s.testCenterName}` : ""} {s.startAt ? `- ${s.startAt}` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h3>4) Hold + Booking</h3>
        <div className="row">
          <div>
            <label>Methodology</label>
            <select value={methodology} onChange={(e) => setMethodology(e.target.value)}>
              <option value="in_person">in_person</option>
              <option value="remote">remote</option>
            </select>
          </div>
          <div>
            <label>Language Code</label>
            <select value={languageCode} onChange={(e) => setLanguageCode(e.target.value)}>
              {(selectedOccupation?.languageCodes?.length ? selectedOccupation.languageCodes : [languageCode]).map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="row">
          <div>
            <label>site_id (auto from session)</label>
            <input value={siteId} onChange={(e) => setSiteId(e.target.value)} />
          </div>
          <div>
            <label>site_city (auto from session)</label>
            <input value={siteCity} onChange={(e) => setSiteCity(e.target.value)} />
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={createHold} type="button" disabled={loading}>Create temporary seat (hold)</button>
          <button onClick={bookReservation} type="button" disabled={loading}>Book reservation</button>
        </div>
      </div>

      <div className="card">
        <h3>5) Live Payment</h3>
        <div className="row">
          <div>
            <label>payment_method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="card">card</option>
            </select>
          </div>
          <div>
            <label>payable_type</label>
            <input value={payableType} onChange={(e) => setPayableType(e.target.value)} />
          </div>
        </div>
        <div className="row">
          <div>
            <label>payable_id (reservation id)</label>
            <input value={payableId} onChange={(e) => setPayableId(e.target.value)} />
          </div>
          <div>
            <label>payment_id</label>
            <input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={createPayment} type="button" disabled={loading}>Create Payment</button>
          <button onClick={fetchPaymentStatus} type="button" disabled={loading}>Get Payment</button>
          <button onClick={finalizePayment} type="button" disabled={loading}>Finalize Payment</button>
          <button onClick={validatePendingPayments} type="button" disabled={loading}>Validate Pending</button>
        </div>
      </div>

      <div className="card">
        <h3>Output (raw)</h3>
        <pre>{out}</pre>
      </div>

      {reservationRaw ? (
        <div className="card">
          <h3>Reservation Result</h3>
          <pre>{JSON.stringify(reservationRaw, null, 2)}</pre>
        </div>
      ) : null}

      {paymentRaw ? (
        <div className="card">
          <h3>Payment Create Result</h3>
          <pre>{JSON.stringify(paymentRaw, null, 2)}</pre>
        </div>
      ) : null}

      {paymentStatusRaw ? (
        <div className="card">
          <h3>Payment Status</h3>
          <pre>{JSON.stringify(paymentStatusRaw, null, 2)}</pre>
        </div>
      ) : null}

      {paymentFinalizeRaw ? (
        <div className="card">
          <h3>Payment Finalize Result</h3>
          <pre>{JSON.stringify(paymentFinalizeRaw, null, 2)}</pre>
        </div>
      ) : null}

      {paymentValidateRaw ? (
        <div className="card">
          <h3>Pending Payment Validation</h3>
          <pre>{JSON.stringify(paymentValidateRaw, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}
