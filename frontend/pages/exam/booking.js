import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, apiWithMeta } from "../../lib/api";

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
  const languageCodes = (o?.category?.prometric_codes || []).map((p) => p?.code).filter(Boolean);
  return {
    id: o?.id,
    name: o?.name || o?.english_name || o?.arabic_name || `Occupation #${o?.id}`,
    categoryId: String(categoryId || ""),
    categoryName:
      o?.category_name_en ||
      o?.category?.english_name ||
      o?.category_name_ar ||
      o?.category?.arabic_name ||
      "",
    languageCodes,
  };
}

function normalizeDateItem(item) {
  const date = item?.exam_date || item?.date || item?.day || item?.start_at_date || "";
  if (typeof date !== "string") return null;
  if (date.match(/^\d{4}-\d{2}-\d{2}$/)) return date;
  if (date.match(/^\d{4}-\d{2}-\d{2}T/)) return date.slice(0, 10);
  return null;
}

function normalizeSession(s) {
  const id = s?.id || s?.exam_session_id || null;
  const cityName = s?.city || s?.site_city_name || s?.test_center_city || s?.site_city?.name || "";
  const cityId = s?.city_id ?? s?.site_city_id ?? s?.site_city?.id ?? null;
  const siteId = s?.site_id ?? s?.test_center_id ?? s?.site?.id ?? null;
  const testCenterName = s?.test_center_name || s?.site_name || s?.site?.name || "";
  const testCenterId = s?.test_center_id ?? s?.site_id ?? s?.site?.id ?? null;
  const startAt = s?.start_at || s?.start_time || "";
  return {
    id: id ? String(id) : "",
    cityName: String(cityName || ""),
    cityId: cityId == null ? "" : String(cityId),
    siteId: siteId == null ? "" : String(siteId),
    testCenterName: String(testCenterName || ""),
    testCenterId: testCenterId == null ? "" : String(testCenterId),
    startAt: String(startAt || ""),
  };
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
    json?.data?.payment?.id ||
    json?.data?.payment_id ||
    json?.payment?.payment_id ||
    json?.data?.id ||
    json?.id ||
    null
  );
}

function extractRedirectUrl(json) {
  return (
    json?.payment?.redirect_url ||
    json?.redirect_url ||
    json?.data?.payment?.redirect_url ||
    json?.data?.redirect_url ||
    null
  );
}

function parsePaymentInfoFromUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return {};
  try {
    const url = new URL(rawUrl);
    const paymentId = url.searchParams.get("paymentId") || "";
    const id = url.searchParams.get("id") || "";
    const resourcePath = url.searchParams.get("resourcePath") || "";
    return { paymentId, id, resourcePath };
  } catch {
    return {};
  }
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
  const [selectedTestCenterId, setSelectedTestCenterId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [siteCity, setSiteCity] = useState("");
  const [languageCode, setLanguageCode] = useState("MTDBB");
  const [methodology, setMethodology] = useState("in_person");

  const [availableDatesRaw, setAvailableDatesRaw] = useState(null);
  const [occupationsRaw, setOccupationsRaw] = useState(null);
  const [constraintsRaw, setConstraintsRaw] = useState(null);
  const [sessionsRaw, setSessionsRaw] = useState(null);
  const [holdRaw, setHoldRaw] = useState(null);
  const [reservationRaw, setReservationRaw] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState("card");
  const [payableType, setPayableType] = useState("Reservation");
  const [payableId, setPayableId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [paymentGatewayId, setPaymentGatewayId] = useState("");
  const [paymentResourcePath, setPaymentResourcePath] = useState("");
  const [paymentRedirectUrl, setPaymentRedirectUrl] = useState("");
  const [paymentRaw, setPaymentRaw] = useState(null);
  const [paymentStatusRaw, setPaymentStatusRaw] = useState(null);
  const [paymentFinalizeRaw, setPaymentFinalizeRaw] = useState(null);
  const [paymentValidateRaw, setPaymentValidateRaw] = useState(null);
  const [statusCodes, setStatusCodes] = useState({
    reservation: null,
    paymentCreate: null,
    paymentGet: null,
    paymentFinalize: null,
    validatePending: null,
  });

  const occList = useMemo(
    () => pickArray(occupationsRaw).map(normalizeOccupation).filter((o) => o.id),
    [occupationsRaw]
  );
  const dateList = useMemo(
    () => uniqueBy(pickArray(availableDatesRaw).map(normalizeDateItem).filter(Boolean), (d) => d),
    [availableDatesRaw]
  );
  const sessionList = useMemo(
    () => pickArray(sessionsRaw).map(normalizeSession).filter((s) => s.id),
    [sessionsRaw]
  );

  const cityOptionsFromConstraints = useMemo(() => {
    const c = constraintsRaw || {};
    const rawCities =
      c?.cities ||
      c?.city_options ||
      c?.test_cities ||
      c?.locations ||
      c?.data?.cities ||
      c?.data?.city_options ||
      [];
    const normalized = (Array.isArray(rawCities) ? rawCities : [])
      .map((x) => {
        if (typeof x === "string") return { cityName: x, cityId: "" };
        return {
          cityName: String(x?.name || x?.city || x?.site_city_name || ""),
          cityId: x?.id == null ? "" : String(x.id),
        };
      })
      .filter((x) => x.cityName);
    return uniqueBy(normalized, (x) => `${x.cityName}::${x.cityId}`);
  }, [constraintsRaw]);

  const cityOptionsFromSessions = useMemo(
    () => uniqueBy(sessionList, (s) => `${s.cityName}::${s.cityId}`),
    [sessionList]
  );

  const cityOptions = useMemo(
    () => uniqueBy([...cityOptionsFromConstraints, ...cityOptionsFromSessions], (x) => `${x.cityName}::${x.cityId}`),
    [cityOptionsFromConstraints, cityOptionsFromSessions]
  );

  const testCenterOptions = useMemo(() => {
    const all = sessionList.map((s) => ({
      id: s.testCenterId || s.siteId,
      name: s.testCenterName || `Center ${s.testCenterId || s.siteId}`,
    }));
    return uniqueBy(all.filter((x) => x.id), (x) => x.id);
  }, [sessionList]);

  const filteredSessions = useMemo(() => {
    if (!selectedTestCenterId) return sessionList;
    return sessionList.filter((s) => (s.testCenterId || s.siteId) === selectedTestCenterId);
  }, [sessionList, selectedTestCenterId]);

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
    loadExamConstraints();
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
    setSelectedTestCenterId(selectedSession.testCenterId || selectedSession.siteId || selectedTestCenterId);
  }, [selectedSession, city, selectedTestCenterId]);

  useEffect(() => {
    if (!selectedTestCenterId || filteredSessions.length === 0) return;
    const exists = filteredSessions.some((s) => s.id === selectedSessionId);
    if (!exists) setSelectedSessionId(filteredSessions[0].id);
  }, [selectedTestCenterId, filteredSessions, selectedSessionId]);

  async function loadExamConstraints() {
    try {
      const res = await api("/api/svp/exam-constraints");
      setConstraintsRaw(res);
    } catch {
      // keep flow usable even if constraints fail
    }
  }

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

  const loadExamSessions = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (!examDate) return setOut("Select exam date first.");
      const cityToUse = city || cityOptions[0]?.cityName || "";
      if (!cityToUse) return setOut("Select city first (required by API).");

      setLoading(true);
      setOut("Loading exam sessions...");
      try {
        const qs = new URLSearchParams({
          category_id: categoryId,
          city: cityToUse,
          exam_date: examDate,
        }).toString();
        const res = await api(`/api/svp/exam-sessions?${qs}`);
        const list = pickArray(res).map(normalizeSession).filter((s) => s.id);
        setSessionsRaw(res);

        if (list[0]) {
          setSelectedSessionId(list[0].id);
          setSelectedTestCenterId(list[0].testCenterId || list[0].siteId);
          if (!city) setCity(list[0].cityName);
          if (!cityId) setCityId(list[0].cityId);
        }

        if (list.length === 0) setOut("No sessions found for selected date/category/city.");
        else setOut(JSON.stringify(res, null, 2));
      } catch (err) {
        setOut(JSON.stringify(err.data || err.message, null, 2));
      } finally {
        setLoading(false);
      }
    },
    [categoryId, city, cityId, cityOptions, examDate]
  );

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

  async function bookReservation() {
    if (!selectedSessionId) return setOut("Select exam session first.");
    if (!occupationId) return setOut("Select occupation first.");

    setLoading(true);
    setOut("Booking exam reservation...");
    try {
      const body = {
        exam_session_id: Number(selectedSessionId),
        occupation_id: Number(occupationId),
        language_code: languageCode,
        site_id: siteId ? Number(siteId) : null,
        site_city: siteCity || city || null,
        hold_id: holdRaw ? extractHoldId(holdRaw) : null,
        methodology,
      };
      const { status, data } = await apiWithMeta("/api/svp/exam-reservations", { method: "POST", body });
      setStatusCodes((s) => ({ ...s, reservation: status }));
      setReservationRaw(data);
      const rid = extractReservationId(data);
      if (rid) setPayableId(String(rid));
      setOut(JSON.stringify(data, null, 2));
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    } finally {
      setLoading(false);
    }
  }

  async function createPayment() {
    if (!payableId) return setOut("Reservation ID (payable_id) required.");
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
      const { status, data } = await apiWithMeta("/api/svp/payments", { method: "POST", body });
      setStatusCodes((s) => ({ ...s, paymentCreate: status }));
      setPaymentRaw(data);
      const pid = extractPaymentId(data);
      if (pid) setPaymentId(String(pid));
      const redirectUrl = extractRedirectUrl(data);
      if (redirectUrl) {
        setPaymentRedirectUrl(redirectUrl);
        const parsed = parsePaymentInfoFromUrl(redirectUrl);
        if (!paymentId && parsed.paymentId) setPaymentId(parsed.paymentId);
        if (!paymentGatewayId && parsed.id) setPaymentGatewayId(parsed.id);
        if (!paymentResourcePath && parsed.resourcePath) setPaymentResourcePath(parsed.resourcePath);
      }
      setOut(JSON.stringify(data, null, 2));
      if (redirectUrl && typeof window !== "undefined") {
        window.open(redirectUrl, "_blank", "noopener,noreferrer");
      }
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
      const { status, data } = await apiWithMeta(`/api/svp/payments/${encodeURIComponent(paymentId)}`);
      setStatusCodes((s) => ({ ...s, paymentGet: status }));
      setPaymentStatusRaw(data);
      setOut(JSON.stringify(data, null, 2));
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
      // Postman flow uses PUT with no body.
      const { status, data } = await apiWithMeta(`/api/svp/payments/${encodeURIComponent(paymentId)}`, { method: "PUT" });
      setStatusCodes((s) => ({ ...s, paymentFinalize: status }));
      setPaymentFinalizeRaw(data);
      setOut(JSON.stringify(data, null, 2));
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
      const { status, data } = await apiWithMeta("/api/svp/payments-validate-pending");
      setStatusCodes((s) => ({ ...s, validatePending: status }));
      setPaymentValidateRaw(data);
      setOut(JSON.stringify(data, null, 2));
    } catch (e) {
      setOut(JSON.stringify(e.data || e.message, null, 2));
    } finally {
      setLoading(false);
    }
  }

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
        <button type="button" onClick={loadOccupations} disabled={loading}>
          Reload Occupations
        </button>
      </div>

      <div className="card">
        <h3>2) Available Dates</h3>
        <form onSubmit={searchAvailableDates}>
          <div className="row">
            <div>
              <label>start_at_date_from (YYYY-MM-DD)</label>
              <input type="date" value={startDateFrom} onChange={(e) => setStartDateFrom(e.target.value)} />
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
          <button type="submit" disabled={loading}>
            Search Dates
          </button>
        </form>
        {dateList.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            <label>Exam Date</label>
            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            <select value={examDate} onChange={(e) => setExamDate(e.target.value)} style={{ marginTop: 8 }}>
              <option value="">Choose available date</option>
              {dateList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h3>3) City + Test Center + Sessions</h3>
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
            <label>Detected Cities</label>
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
                  {c.cityName} {c.cityId ? `(city_id: ${c.cityId})` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <button onClick={loadExamSessions} type="button" disabled={loading}>
          Load Sessions
        </button>

        {testCenterOptions.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            <label>Test Center</label>
            <select value={selectedTestCenterId} onChange={(e) => setSelectedTestCenterId(e.target.value)}>
              {testCenterOptions.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.name} (#{tc.id})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {filteredSessions.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <label>Session</label>
            <select value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)}>
              {filteredSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} - {s.testCenterName || "Center"} {s.startAt ? `- ${s.startAt}` : ""}
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
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="row">
          <div>
            <label>site_id</label>
            <input value={siteId} onChange={(e) => setSiteId(e.target.value)} />
          </div>
          <div>
            <label>site_city</label>
            <input value={siteCity} onChange={(e) => setSiteCity(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={createHold} type="button" disabled={loading}>
            Create Hold
          </button>
          <button onClick={bookReservation} type="button" disabled={loading}>
            Book Reservation
          </button>
        </div>
      </div>

      <div className="card">
        <h3>5) Live Payment</h3>
        <p className="small">
          HTTP Status: reservation={statusCodes.reservation ?? "-"}, create={statusCodes.paymentCreate ?? "-"}, get={statusCodes.paymentGet ?? "-"}, finalize={statusCodes.paymentFinalize ?? "-"}, validate={statusCodes.validatePending ?? "-"}
        </p>
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
        <div className="row">
          <div>
            <label>gateway id (from redirect callback `id`)</label>
            <input value={paymentGatewayId} onChange={(e) => setPaymentGatewayId(e.target.value)} />
          </div>
          <div>
            <label>resourcePath (from callback)</label>
            <input value={paymentResourcePath} onChange={(e) => setPaymentResourcePath(e.target.value)} />
          </div>
        </div>
        {paymentRedirectUrl ? (
          <p className="small">
            Redirect URL: <a href={paymentRedirectUrl} target="_blank" rel="noreferrer">{paymentRedirectUrl}</a>
          </p>
        ) : null}
        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={createPayment} type="button" disabled={loading}>
            Create Payment
          </button>
          <button onClick={fetchPaymentStatus} type="button" disabled={loading}>
            Get Payment
          </button>
          <button onClick={finalizePayment} type="button" disabled={loading}>
            Finalize Payment
          </button>
          <button onClick={validatePendingPayments} type="button" disabled={loading}>
            Validate Pending
          </button>
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
