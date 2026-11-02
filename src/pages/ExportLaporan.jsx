import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import { formatRupiah } from "../utils/formatCurrency";
import { getJakartaDateParts } from "../utils/dateUtils";
import {
  FileSpreadsheet,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  CalendarDays,
  Store,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function ExportLaporan() {
  const { business } = useAuth();
  const businessName = business?.name || "KasFlow";
  const now = getJakartaDateParts();
  const [bulan, setBulan] = useState(now.month - 1);
  const [tahun, setTahun] = useState(now.year);
  const [queryResult, setQueryResult] = useState({
    key: null,
    data: [],
    error: null,
  });
  const [status, setStatus] = useState(null);

  const businessId = business?.id ?? null;
  const queryKey = JSON.stringify([businessId, bulan, tahun]);
  const currentResult =
    businessId && queryResult.key === queryKey ? queryResult : null;
  const data = currentResult?.data ?? [];
  const queryError = currentResult?.error ?? null;
  const loading = Boolean(businessId) && !currentResult;

  const totalIncome = data
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = data
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const selisihBersih = totalIncome - totalExpense;

  useEffect(() => {
    if (!businessId) return undefined;

    let active = true;
    const start = `${tahun}-${String(bulan + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(tahun, bulan + 1, 0).getDate();
    const end = `${tahun}-${String(bulan + 1).padStart(2, "0")}-${lastDay}`;

    async function loadData() {
      try {
        const { data: rows, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("business_id", businessId)
          .gte("transaction_date", start)
          .lte("transaction_date", end)
          .order("transaction_date", { ascending: true });

        if (!active) return;
        setQueryResult({
          key: queryKey,
          data: error ? [] : rows || [],
          error: error?.message ?? null,
        });
      } catch (error) {
        if (active)
          setQueryResult({
            key: queryKey,
            data: [],
            error: error.message || "Gagal memuat laporan.",
          });
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [businessId, bulan, tahun, queryKey]);

  // ── Export Excel ──
  function exportExcel() {
    if (data.length === 0)
      return setStatus({
        type: "error",
        msg: "Tidak ada data untuk diexport.",
      });

    const rows = [
      ["LAPORAN KEUANGAN KASFLOW"],
      [businessName],
      [`Periode: ${BULAN[bulan]} ${tahun}`],
      [],
      ["Tanggal", "Jenis", "Kategori", "Catatan", "Nominal (Rp)"],
      ...data.map((t) => [
        // Excel serial date keeps this as a date value, with a readable display format.
        Math.floor(Date.parse(`${t.transaction_date}T00:00:00Z`) / 86400000) +
          25569,
        t.type === "income" ? "Pemasukan" : "Pengeluaran",
        t.category || "-",
        t.note || "-",
        Number(t.amount),
      ]),
      [],
      ["RINGKASAN", "", "", "", ""],
      ["TOTAL PEMASUKAN", "", "", "", totalIncome],
      ["TOTAL PENGELUARAN", "", "", "", totalExpense],
      ["SELISIH BERSIH", "", "", "", selisihBersih],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const sanitizedName = businessName.replace(/[^a-zA-Z0-9_-]/g, "_");
    ws["!cols"] = [
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 42 },
      { wch: 20 },
    ];
    ws["!rows"] = [
      { hpt: 26 },
      { hpt: 20 },
      { hpt: 20 },
      { hpt: 8 },
      { hpt: 22 },
    ];
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
    ];
    ws["!autofilter"] = { ref: `A5:E${5 + data.length}` };
    const currencyFormat = '"Rp" #,##0;[Red]-"Rp" #,##0';
    for (let row = 5; row < 5 + data.length; row += 1) {
      const dateCell = ws[`A${row + 1}`];
      if (dateCell) dateCell.z = "dd mmm yyyy";
      const amountCell = ws[`E${row + 1}`];
      if (amountCell) amountCell.z = currencyFormat;
    }
    for (let row = 8 + data.length; row <= 10 + data.length; row += 1) {
      const amountCell = ws[`E${row}`];
      if (amountCell) amountCell.z = currencyFormat;
    }
    const wb = XLSX.utils.book_new();
    wb.Props = {
      Title: `Laporan Keuangan ${businessName}`,
      Subject: `Periode ${BULAN[bulan]} ${tahun}`,
      Author: "KasFlow",
    };
    XLSX.utils.book_append_sheet(wb, ws, `${BULAN[bulan]} ${tahun}`);
    XLSX.writeFile(
      wb,
      `Laporan_${sanitizedName}_${BULAN[bulan]}_${tahun}.xlsx`,
    );
    setStatus({ type: "success", msg: "File Excel berhasil didownload!" });
  }

  // ── Export PDF ──
  function exportPDF() {
    if (data.length === 0)
      return setStatus({
        type: "error",
        msg: "Tidak ada data untuk diexport.",
      });

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const accent = [8, 127, 104];

    // Report identity
    doc.setFillColor(...accent);
    doc.roundedRect(14, 12, 9, 9, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("K", 18.5, 18.2, { align: "center" });
    doc.setTextColor(31, 41, 37);
    doc.setFontSize(9);
    doc.text("KasFlow  /  LAPORAN KEUANGAN", 27, 16);
    doc.setFontSize(16);
    const titleLines = doc.splitTextToSize(businessName, pageWidth - 28);
    doc.text(titleLines, 14, 30);
    const titleBottom = 30 + (titleLines.length - 1) * 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(95, 109, 105);
    doc.text(`Periode: ${BULAN[bulan]} ${tahun}`, 14, titleBottom + 7);
    doc.setDrawColor(226, 233, 230);
    doc.line(14, titleBottom + 12, pageWidth - 14, titleBottom + 12);

    // Ringkasan
    doc.setTextColor(23, 33, 31);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const summaryHeadingY = titleBottom + 22;
    doc.text("Ringkasan", 14, summaryHeadingY);
    autoTable(doc, {
      startY: summaryHeadingY + 3,
      head: [["Keterangan", "Jumlah"]],
      body: [
        ["Total Pemasukan", formatRupiah(totalIncome)],
        ["Total Pengeluaran", formatRupiah(totalExpense)],
        ["Selisih Bersih", formatRupiah(selisihBersih)],
      ],
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 3,
        textColor: [55, 65, 62],
        lineColor: [232, 237, 234],
        lineWidth: 0.15,
      },
      headStyles: { fillColor: accent, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 249, 248] },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      margin: { left: 14, right: 14 },
    });

    // Detail Transaksi
    const afterSummary = doc.lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Detail Transaksi", 14, afterSummary);

    autoTable(doc, {
      startY: afterSummary + 3,
      head: [["Tanggal", "Jenis", "Kategori", "Catatan", "Nominal"]],
      body: data.map((t) => [
        t.transaction_date,
        t.type === "income" ? "Pemasukan" : "Pengeluaran",
        t.category || "-",
        t.note || "-",
        formatRupiah(Number(t.amount)),
      ]),
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2.5,
        overflow: "linebreak",
        textColor: [55, 65, 62],
        lineColor: [232, 237, 234],
        lineWidth: 0.15,
      },
      headStyles: { fillColor: accent, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 249, 248] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 27 },
        2: { cellWidth: 29 },
        4: { halign: "right", cellWidth: 29 },
      },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150);
      doc.setDrawColor(226, 233, 230);
      doc.line(14, 285, pageWidth - 14, 285);
      doc.text(
        `Dicetak: ${new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta" }).format(new Date())}  |  Halaman ${i} dari ${pageCount}`,
        pageWidth / 2,
        291,
        { align: "center" },
      );
    }

    const sanitizedName = businessName.replace(/[^a-zA-Z0-9_-]/g, "_");
    doc.save(`Laporan_${sanitizedName}_${BULAN[bulan]}_${tahun}.pdf`);
    setStatus({ type: "success", msg: "File PDF berhasil didownload!" });
  }

  const tahunOptions = [now.year - 1, now.year, now.year + 1];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-5">
      <header className="px-1 pt-1">
        <p className="flex items-center gap-2 text-sm font-medium text-(--kf-text-muted)">
          <Store size={16} className="text-(--kf-accent)" />
          {businessName}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-(--kf-text) sm:text-3xl">
          Export Laporan
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-(--kf-text-muted)">
          Pilih periode untuk meninjau ringkasan, lalu unduh laporan dalam
          format PDF atau Excel.
        </p>
      </header>

      <div className="flex flex-col gap-5 pb-4">
        <section
          className="grid gap-4 md:grid-cols-[minmax(15rem,0.85fr)_minmax(0,1.15fr)]"
          aria-label="Periode dan ringkasan laporan"
        >
          <div className="rounded-(--kf-radius-lg) border border-(--kf-border) bg-white p-4 shadow-(--kf-shadow-sm) sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-(--kf-text)">
              <CalendarDays size={19} className="text-(--kf-accent)" />
              Periode Laporan
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label
                  htmlFor="report-month"
                  className="mb-1.5 block text-sm font-medium text-(--kf-text-muted)"
                >
                  Bulan
                </label>
                <select
                  id="report-month"
                  value={bulan}
                  onChange={(e) => setBulan(Number(e.target.value))}
                  className="min-h-12 w-full rounded-(--kf-radius-sm) border border-(--kf-border-strong) bg-white px-3 text-base text-(--kf-text) focus:outline-none focus:ring-2 focus:ring-(--kf-accent-soft)"
                >
                  {BULAN.map((b, i) => (
                    <option key={i} value={i}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label
                  htmlFor="report-year"
                  className="mb-1.5 block text-sm font-medium text-(--kf-text-muted)"
                >
                  Tahun
                </label>
                <select
                  id="report-year"
                  value={tahun}
                  onChange={(e) => setTahun(Number(e.target.value))}
                  className="min-h-12 w-full rounded-(--kf-radius-sm) border border-(--kf-border-strong) bg-white px-3 text-base text-(--kf-text) focus:outline-none focus:ring-2 focus:ring-(--kf-accent-soft)"
                >
                  {tahunOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-(--kf-radius-lg) border border-(--kf-border) bg-white p-4 shadow-(--kf-shadow-sm) sm:p-5">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-(--kf-text)">
                Ringkasan
              </h2>
              <span className="text-sm text-(--kf-text-muted)">
                {BULAN[bulan]} {tahun}
              </span>
            </div>
            {loading ? (
              <div
                className="flex flex-col gap-2"
                aria-label="Memuat ringkasan"
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-lg bg-gray-100"
                  />
                ))}
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-(--kf-border) py-2.5">
                  <span className="text-sm text-(--kf-text-muted)">
                    Total Pemasukan
                  </span>
                  <span className="text-right text-sm font-semibold tabular-nums text-emerald-700">
                    {formatRupiah(totalIncome)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-(--kf-border) py-2.5">
                  <span className="text-sm text-(--kf-text-muted)">
                    Total Pengeluaran
                  </span>
                  <span className="text-right text-sm font-semibold tabular-nums text-rose-700">
                    {formatRupiah(totalExpense)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-2.5">
                  <span className="text-sm font-semibold text-(--kf-text)">
                    Selisih Bersih
                  </span>
                  <span
                    className={`text-right text-base font-bold tabular-nums ${selisihBersih >= 0 ? "text-(--kf-accent)" : "text-rose-700"}`}
                  >
                    {formatRupiah(selisihBersih)}
                  </span>
                </div>
                <p className="mt-2 border-t border-(--kf-border) pt-2 text-xs text-(--kf-text-subtle)">
                  {data.length} transaksi tercatat
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Status */}
        {queryError && (
          <div
            role="alert"
            className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600"
          >
            <AlertCircle size={20} />
            <span className="text-sm font-medium">
              Gagal memuat laporan. Coba ubah periode atau muat ulang halaman.
            </span>
          </div>
        )}
        {status && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl ${
              status.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-600"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="text-sm font-medium">{status.msg}</span>
          </div>
        )}

        {/* Tombol Export */}
        <section aria-labelledby="export-format-heading">
          <div className="mb-3">
            <h2
              id="export-format-heading"
              className="text-base font-semibold text-(--kf-text)"
            >
              Unduh Laporan
            </h2>
            <p className="mt-0.5 text-sm text-(--kf-text-muted)">
              Pilih format yang sesuai dengan kebutuhan Anda.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <article className="flex min-w-0 flex-col justify-between gap-5 rounded-(--kf-radius-lg) border border-(--kf-border) bg-white p-4 shadow-(--kf-shadow-sm) sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-(--kf-radius-sm) bg-(--kf-accent-soft) p-2.5 text-(--kf-accent)">
                  <FileSpreadsheet size={22} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-(--kf-text)">Excel</h3>
                  <p className="mt-0.5 text-sm leading-5 text-(--kf-text-muted)">
                    Lembar kerja untuk mengolah dan meninjau data transaksi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={exportExcel}
                disabled={loading}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-(--kf-radius-md) border border-(--kf-border-strong) bg-white px-4 text-sm font-semibold text-(--kf-text) transition-colors hover:bg-(--kf-surface-soft) disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={17} aria-hidden="true" />
                Download Excel
              </button>
            </article>
            <article className="flex min-w-0 flex-col justify-between gap-5 rounded-(--kf-radius-lg) border border-(--kf-border) bg-white p-4 shadow-(--kf-shadow-sm) sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-(--kf-radius-sm) bg-slate-100 p-2.5 text-slate-700">
                  <FileText size={22} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-(--kf-text)">PDF</h3>
                  <p className="mt-0.5 text-sm leading-5 text-(--kf-text-muted)">
                    Laporan rapi yang siap dibagikan atau dicetak.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={exportPDF}
                disabled={loading}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-(--kf-radius-md) bg-(--kf-accent) px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--kf-accent-hover) disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={17} aria-hidden="true" />
                Download PDF
              </button>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
