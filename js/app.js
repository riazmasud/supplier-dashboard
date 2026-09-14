document.getElementById("csvFile").addEventListener("change", function (event) {
  const targetFile = event.target.files[0];

  if (!targetFile) return;

  document.getElementById("fileStatus").textContent =
    "Parsing " + targetFile.name + " ...";

  Papa.parse(targetFile, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      console.log("Total length of the file: ", results.data.length);
      console.log("The actual date in file: ", results.data[0]);

      document.getElementById("fileStatus").textContent =
        "Loaded " + results.data.length + " rows from " + targetFile.name;

      const currencies = new Set(results.data.map((row) => row.currency));
      console.log("Unique currencies found: ", currencies.size, currencies);

      const supplierStatus = calculateOnTimeDelivery(results.data);
      console.log(supplierStatus);

      renderTable(supplierStatus);
    },
  });
});

function calculateOnTimeDelivery(rows) {
  // one entry per supplier, keyed by supplier_id, holding running totals
  const bySupplier = {};

  rows.forEach((row) => {
    const supplierId = row.supplier_id;

    // first time we see this supplier, set up their starting counters
    if (!bySupplier[supplierId]) {
      bySupplier[supplierId] = {
        supplier_name: row.supplier_name,
        total_orders: 0,
        deliverable_orders: 0,
        on_time_orders: 0,
        received_units: 0,
        rejected_units: 0,
      };
    }

    // counts every row for this supplier, regardless of status
    bySupplier[supplierId].total_orders += 1;

    const actualDate = row.actual_delivery_date;
    const promisedDate = row.promised_delivery_date;

    // Open/Cancelled orders don't have an actual delivery date yet,
    // so there's nothing to compare - skip them for on-time calc
    if (row.order_status === "Open" || row.order_status === "Cancelled") {
      return; // skips to the next row
    }
    // just in case a row is missing a date unexpectedly
    if (!actualDate || !promisedDate) {
      return;
    }

    // if we got here, this order can actually be judged on-time or late
    bySupplier[supplierId].deliverable_orders += 1;

    // Accumulate reject data first - independent of delivery date logic,
    // and happens even for orders that are still Partially Delivered.
    bySupplier[supplierId].received_units += Number(row.received_quantity) || 0;
    bySupplier[supplierId].rejected_units += Number(row.rejected_quantity) || 0;

    // on-time = delivered on or before the date the supplier promised
    if (new Date(actualDate) <= new Date(promisedDate)) {
      bySupplier[supplierId].on_time_orders += 1;
    }
  });

  // turn the object of totals into an array of final numbers per supplier
  return Object.values(bySupplier).map((supplier) => {
    // null if no deliverable orders yet, so we can show "N/A" instead of 0%
    const onTimeOrderPercentage =
      supplier.deliverable_orders > 0
        ? (supplier.on_time_orders / supplier.deliverable_orders) * 100
        : null;

    // reject rate is based on received units, not ordered units -
    // see README for why
    const rejectRate =
      supplier.received_units > 0
        ? (supplier.rejected_units / supplier.received_units) * 100
        : null;

    return {
      supplier_name: supplier.supplier_name,
      total_orders: supplier.total_orders,
      deliverable_orders: supplier.deliverable_orders,
      on_time_pct: onTimeOrderPercentage,
      reject_rate: rejectRate,
    };
  });
}

function renderTable(data) {
  // default sort: worst on-time performers first, so risks are visible up top
  data.sort((a, b) => (a.on_time_pct ?? 999) - (b.on_time_pct ?? 999));
  const tbody = document.querySelector("#supplierTable tbody");
  tbody.innerHTML = "";
  data.forEach((supplier) => {
    const tr = document.createElement("tr");
    const pctText =
      supplier.on_time_pct === null
        ? "N/A"
        : supplier.on_time_pct.toFixed(1) + "%";
    const badgeClass =
      supplier.on_time_pct === null
        ? ""
        : supplier.on_time_pct >= 90
          ? "good"
          : supplier.on_time_pct >= 75
            ? "warn"
            : "bad";
    const rejectText =
      supplier.reject_rate === null
        ? "N/A"
        : supplier.reject_rate.toFixed(2) + "%";
    // NOTE: for reject rate, LOWER is better - so the good/warn/bad
    // thresholds are inverted compared to on-time delivery.
    const rejectBadgeClass =
      supplier.reject_rate === null
        ? ""
        : supplier.reject_rate <= 1
          ? "good"
          : supplier.reject_rate <= 2
            ? "warn"
            : "bad";
    tr.innerHTML = `
      <td>${supplier.supplier_name}</td>
      <td>${supplier.total_orders}</td>
      <td><span class="badge ${badgeClass}">${pctText}</span></td>
      <td><span class="badge ${rejectBadgeClass}">${rejectText}</span></td>
    `;

    tbody.appendChild(tr);
  });
}

// Basic column sorting on header click
document.querySelectorAll("#supplierTable th").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.key;
    const tbody = document.querySelector("#supplierTable tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));
    // simple re-sort based on visible text of the relevant column
    const colIndex = Array.from(th.parentNode.children).indexOf(th);
    rows.sort((a, b) => {
      const aText = a.children[colIndex].textContent.replace("%", "");
      const bText = b.children[colIndex].textContent.replace("%", "");
      const aNum = parseFloat(aText);
      const bNum = parseFloat(bText);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return aText.localeCompare(bText);
    });
    rows.forEach((r) => tbody.appendChild(r));
  });
});
