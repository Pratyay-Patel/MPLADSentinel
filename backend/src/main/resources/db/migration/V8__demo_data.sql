-- V8 -- Synthetic development/demo data.
--
-- These rows are deliberately marked with source_name = 'DEMO'. They are not
-- MPLADS records and must never be presented as data from the official system
-- or the Empowered Indian secondary source. The migration is useful for a
-- fresh local database and for demonstrating the dashboard without a live
-- ingestion run.

DO $$
BEGIN
    -- Never mix synthetic rows into an already populated database.
        IF NOT EXISTS (SELECT 1 FROM ingestion_run LIMIT 1)
            AND NOT EXISTS (SELECT 1 FROM raw_source_record LIMIT 1)
            AND NOT EXISTS (SELECT 1 FROM ingestion_dead_letter LIMIT 1)
            AND NOT EXISTS (SELECT 1 FROM work LIMIT 1)
            AND NOT EXISTS (SELECT 1 FROM work_payment LIMIT 1)
            AND NOT EXISTS (SELECT 1 FROM app_user LIMIT 1)
            AND NOT EXISTS (SELECT 1 FROM grievance LIMIT 1) THEN
INSERT INTO ingestion_run (
    source_name, endpoint, api_base_url, trigger_type, status,
    started_at, finished_at, page_size, first_page, last_page_completed,
    pages_fetched, records_seen, records_inserted, notes
) VALUES (
    'DEMO', 'WORKS_RECOMMENDED', 'demo://mpladsentinel', 'MANUAL', 'SUCCEEDED',
    '2026-01-15T09:00:00Z', '2026-01-15T09:00:01Z', 20, 1, 1,
    1, 6, 6, 'Synthetic data for local development and demonstrations.'
);

INSERT INTO work (
    source_name, source_work_id, work_description, category, category_normalized,
    house, ls_term, mp_name, mp_name_normalized, constituency, constituency_normalized,
    state, state_normalized, district, district_normalized, location_raw,
    implementing_authority_text, estimated_cost, final_cost, currency,
    recommended_on, recommended_year, completed_on, completion_year, source_status_raw,
    expected_beneficiaries, seen_in_recommended, seen_in_completed, lifecycle_state,
    rec_has_payments, rec_total_paid, rec_payment_count, payment_data_state,
    payment_total_paid, payment_installments, payment_successful_count,
    payment_pending_count, payment_first_on, payment_last_on, payment_scheme_description,
    data_quality_flags, source_response_at, first_ingested_at, last_ingested_at,
    last_ingestion_run_id
)
SELECT
    v.source_name, v.source_work_id, v.work_description, v.category, v.category_normalized,
    v.house, v.ls_term, v.mp_name, v.mp_name_normalized, v.constituency, v.constituency_normalized,
    v.state, v.state_normalized, v.district, v.district_normalized, v.location_raw,
    v.implementing_authority_text, v.estimated_cost, v.final_cost, 'INR',
    v.recommended_on, v.recommended_year, v.completed_on, v.completion_year, v.source_status_raw,
    v.expected_beneficiaries, v.seen_in_recommended, v.seen_in_completed, v.lifecycle_state,
    v.rec_has_payments, v.rec_total_paid, v.rec_payment_count, v.payment_data_state,
    v.payment_total_paid, v.payment_installments, v.payment_successful_count,
    v.payment_pending_count, v.payment_first_on, v.payment_last_on, v.payment_scheme_description,
    v.data_quality_flags, v.source_response_at, v.source_response_at, v.source_response_at,
    r.id
FROM (VALUES
    ('DEMO', 990000001::BIGINT, 'Community health centre renovation', 'Health', 'health', 'LOK_SABHA', 17::SMALLINT, 'Demo MP North', 'demo mp north', 'Demo North', 'demo north', 'Karnataka', 'karnataka', 'Bengaluru Rural', 'bengaluru rural', 'Doddaballapur', 'Demo District Works Division', 2500000.00::NUMERIC, NULL::NUMERIC, DATE '2025-04-10', 2025::SMALLINT, NULL::DATE, NULL::SMALLINT, 'Recommended', 1200, TRUE, FALSE, 'RECOMMENDED', TRUE, 500000.00::NUMERIC, 1, 'FETCHED_PRESENT', 500000.00::NUMERIC, 1, 1, 0, DATE '2025-05-15', DATE '2025-05-15', 'Community infrastructure', ARRAY[]::TEXT[], TIMESTAMPTZ '2026-01-15T09:00:00Z'),
    ('DEMO', 990000002::BIGINT, 'Solar street lighting for market road', 'Infrastructure', 'infrastructure', 'LOK_SABHA', 17::SMALLINT, 'Demo MP South', 'demo mp south', 'Demo South', 'demo south', 'Maharashtra', 'maharashtra', 'Pune', 'pune', 'Shirur market road', 'Demo Municipal Council', 1800000.00::NUMERIC, 1750000.00::NUMERIC, DATE '2024-02-12', 2024::SMALLINT, DATE '2025-01-20', 2025::SMALLINT, 'Completed', 800, FALSE, TRUE, 'COMPLETED', NULL::BOOLEAN, NULL::NUMERIC, NULL::INTEGER, 'NOT_FETCHED', NULL::NUMERIC, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::DATE, NULL::DATE, NULL::TEXT, ARRAY[]::TEXT[], TIMESTAMPTZ '2026-01-15T09:00:00Z'),
    ('DEMO', 990000003::BIGINT, 'Rural drinking water pipeline', 'Water supply', 'water supply', 'LOK_SABHA', 16::SMALLINT, 'Demo MP East', 'demo mp east', 'Demo East', 'demo east', 'Odisha', 'odisha', 'Cuttack', 'cuttack', 'Three village cluster', 'Demo Public Health Engineering', 4200000.00::NUMERIC, NULL::NUMERIC, DATE '2024-08-01', 2024::SMALLINT, NULL::DATE, NULL::SMALLINT, 'Recommended', 3000, TRUE, FALSE, 'RECOMMENDED', FALSE, 0.00::NUMERIC, 0, 'FETCHED_ABSENT', NULL::NUMERIC, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::DATE, NULL::DATE, NULL::TEXT, ARRAY[]::TEXT[], TIMESTAMPTZ '2026-01-15T09:00:00Z'),
    ('DEMO', 990000004::BIGINT, 'Government school classroom block', 'Education', 'education', 'LOK_SABHA', 18::SMALLINT, 'Demo MP West', 'demo mp west', 'Demo West', 'demo west', 'Rajasthan', 'rajasthan', 'Ajmer', 'ajmer', 'Kishangarh block', 'Demo Education Department', 3600000.00::NUMERIC, 3900000.00::NUMERIC, DATE '2023-06-20', 2023::SMALLINT, DATE '2025-03-10', 2025::SMALLINT, 'Completed', 450, TRUE, TRUE, 'RECOMMENDED_AND_COMPLETED', TRUE, 3900000.00::NUMERIC, 2, 'FETCHED_PRESENT', 3900000.00::NUMERIC, 2, 2, 0, DATE '2024-01-12', DATE '2025-02-18', 'School building works', ARRAY[]::TEXT[], TIMESTAMPTZ '2026-01-15T09:00:00Z'),
    ('DEMO', 990000005::BIGINT, 'Flood protection retaining wall', 'Flood control', 'flood control', 'LOK_SABHA', 17::SMALLINT, 'Demo MP Central', 'demo mp central', 'Demo Central', 'demo central', 'Assam', 'assam', 'Kamrup', 'kamrup', 'Riverbank settlement', 'Demo Water Resources Division', 5100000.00::NUMERIC, NULL::NUMERIC, DATE '2022-07-01', 2022::SMALLINT, NULL::DATE, NULL::SMALLINT, 'Recommended', 2100, TRUE, FALSE, 'RECOMMENDED', NULL::BOOLEAN, NULL::NUMERIC, NULL::INTEGER, 'FETCH_ERROR', NULL::NUMERIC, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::DATE, NULL::DATE, NULL::TEXT, ARRAY['PAYMENT_FETCH_ERROR']::TEXT[], TIMESTAMPTZ '2026-01-15T09:00:00Z'),
    ('DEMO', 990000006::BIGINT, NULL, 'Other', 'other', 'LOK_SABHA', 18::SMALLINT, 'Demo MP North', 'demo mp north', 'Demo North', 'demo north', 'Kerala', 'kerala', 'Kollam', 'kollam', 'Demo location', 'Demo Local Authority', 900000.00::NUMERIC, NULL::NUMERIC, DATE '2025-09-01', 2025::SMALLINT, NULL::DATE, NULL::SMALLINT, 'Recommended', 0, TRUE, FALSE, 'RECOMMENDED', NULL::BOOLEAN, NULL::NUMERIC, NULL::INTEGER, 'NOT_FETCHED', NULL::NUMERIC, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::DATE, NULL::DATE, NULL::TEXT, ARRAY['MISSING_WORK_DESCRIPTION']::TEXT[], TIMESTAMPTZ '2026-01-15T09:00:00Z')
) AS v(
    source_name, source_work_id, work_description, category, category_normalized, house, ls_term,
    mp_name, mp_name_normalized, constituency, constituency_normalized, state, state_normalized,
    district, district_normalized, location_raw, implementing_authority_text, estimated_cost,
    final_cost, recommended_on, recommended_year, completed_on, completion_year, source_status_raw,
    expected_beneficiaries, seen_in_recommended, seen_in_completed, lifecycle_state, rec_has_payments,
    rec_total_paid, rec_payment_count, payment_data_state, payment_total_paid, payment_installments,
    payment_successful_count, payment_pending_count, payment_first_on, payment_last_on,
    payment_scheme_description, data_quality_flags, source_response_at
)
CROSS JOIN (SELECT id FROM ingestion_run WHERE source_name = 'DEMO' AND api_base_url = 'demo://mpladsentinel') r;

INSERT INTO work_payment (
    work_id, source_ordinal, amount, currency, paid_on, status_raw, status,
    vendor_name, vendor_name_normalized, implementing_authority_text,
    source_fingerprint, ingestion_run_id
)
SELECT w.id, p.source_ordinal, p.amount, 'INR', p.paid_on, 'Payment Success', 'SUCCESS',
       p.vendor_name, lower(p.vendor_name), p.implementing_authority_text,
       p.source_fingerprint, r.id
FROM (VALUES
    (990000001::BIGINT, 0::SMALLINT, 250000.00::NUMERIC, DATE '2025-05-15', 'Demo Civil Works Ltd', 'Demo District Works Division', 'demo-payment-990000001-0'),
    (990000001::BIGINT, 1::SMALLINT, 250000.00::NUMERIC, DATE '2025-06-20', 'Demo Civil Works Ltd', 'Demo District Works Division', 'demo-payment-990000001-1')
) AS p(source_work_id, source_ordinal, amount, paid_on, vendor_name, implementing_authority_text, source_fingerprint)
JOIN work w ON w.source_name = 'DEMO' AND w.source_work_id = p.source_work_id
CROSS JOIN (SELECT id FROM ingestion_run WHERE source_name = 'DEMO' AND api_base_url = 'demo://mpladsentinel') r;

INSERT INTO grievance (
    work_reference, category, subject, description, contact_name, contact_email,
    submitted_by_user_id, status, action_note, submitted_at, updated_at
)
VALUES
    (990000003, 'Delay in execution', 'Pipeline work appears stalled',
     'Synthetic grievance for demonstrating the citizen and authority workflow.',
     'Demo Citizen', 'demo.citizen@example.invalid', NULL, 'SUBMITTED', NULL,
     '2026-01-20T10:00:00Z', '2026-01-20T10:00:00Z'),
    (990000004, 'Quality of work', 'School block needs inspection',
     'Synthetic grievance for demonstrating an actioned authority response.',
     'Demo Citizen', 'demo.citizen@example.invalid', NULL, 'ACTIONED',
     'Demo inspection completed for demonstration purposes.',
     '2026-01-18T10:00:00Z', '2026-01-22T12:00:00Z');

COMMENT ON TABLE work IS 'Unified MPLADS work assembled from source data; V8 also contains clearly labeled synthetic DEMO rows for local development.';
    END IF;
END
$$;