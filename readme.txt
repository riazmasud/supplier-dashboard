Supplier Performance Dashboard - Notes

Open index.html in a browser, upload the CSV, and it shows a table of supplier metrics. Everything runs in the browser, no server needed. I used PapaParse to read the CSV, then grouped the rows by supplier in JS and calculated the metrics.

CSV location: supplier-dashboard/data/supplier_performance_granular.csv (this path is relative to wherever you unzip the project folder)

Metrics I included:

On-Time Delivery % - compares actual_delivery_date to promised_delivery_date. I used promised date instead of requested date since that's what the supplier actually committed to. Open and Cancelled orders are skipped since they don't have a delivery date to check.

Reject Rate % - rejected_quantity divided by received_quantity. I used received instead of ordered because some orders are only partially delivered, so dividing by received gives a more accurate picture of what's actually showed up.

If a supplier doesn't have enough data yet to calculate a metric, it shows N/A instead of 0%, since 0% would look like bad performance when really there's just no data.

Colors: green/yellow/red for each metric. For on-time delivery, higher is better. For reject rate, lower is better, so the colors are flipped. Thresholds are just based on eyeballing the spread of the data, not any official standard.

Data has 16 currencies with no exchange rates, so no $ comparisons across suppliers. Some fields like invoice status and compliance docs are missing on a lot of rows, even delivered ones — didn't try to guess those. This version only covers delivery and quality for now.

Notes/assumptions:
- Each CSV row = one order line.
- Supplier is identified by supplier_id, name is just for display.
- Everything recalculates fresh each time you upload a file, nothing is saved.