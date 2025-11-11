-- Seed 20 test investors with varied industry and ARR preferences
DO $$
DECLARE
  idx integer;
  user_record json;
  investor_id uuid;
  sector_options jsonb[] := ARRAY[
    jsonb_build_object('sector', 'Fintech', 'sub_sector', 'Payments'),
    jsonb_build_object('sector', 'HealthTech', 'sub_sector', 'Digital Health'),
    jsonb_build_object('sector', 'ClimateTech', 'sub_sector', 'Carbon Capture'),
    jsonb_build_object('sector', 'AI/ML', 'sub_sector', 'Enterprise AI'),
    jsonb_build_object('sector', 'E-commerce', 'sub_sector', 'Marketplace')
  ];
  geo_options text[] := ARRAY['US', 'Europe', 'India'];
  ownership_options text[] := ARRAY['Lead Rounds', 'Follow-on Checks', 'Board Seat Optional'];
  business_models text[] := ARRAY['B2B SaaS', 'Marketplace', 'Enterprise', 'Consumer'];
  sector_choice jsonb;
  geography_choice jsonb;
  ownership_choice jsonb;
  business_model_choice jsonb;
  min_arr_value numeric;
BEGIN
  FOR idx IN 1..20 LOOP
    -- Create the auth user with confirmed email
    SELECT auth.admin_create_user(
      email => format('investor%02s@test.pitchfork', idx),
      password => 'TestPass!234',
      email_confirm => true
    )::json INTO user_record;

    investor_id := (user_record ->> 'id')::uuid;

    -- Ensure profile exists and is marked as investor
    INSERT INTO user_profiles (user_id, user_type)
    VALUES (investor_id, 'investor')
    ON CONFLICT (user_id) DO UPDATE SET user_type = EXCLUDED.user_type;

    -- Prepare rotating preferences in local variables
    sector_choice := sector_options[(idx - 1) % array_length(sector_options, 1) + 1];
    geography_choice := to_jsonb(ARRAY[
      geo_options[(idx - 1) % array_length(geo_options, 1) + 1],
      geo_options[idx % array_length(geo_options, 1) + 1]
    ]);
    ownership_choice := to_jsonb(ARRAY[
      ownership_options[(idx - 1) % array_length(ownership_options, 1) + 1]
    ]);
    business_model_choice := to_jsonb(ARRAY[
      business_models[(idx - 1) % array_length(business_models, 1) + 1]
    ]);
    min_arr_value := ((idx - 1) * 100000 + 250000);

    INSERT INTO investor_details (
      user_id,
      name,
      email,
      firm_name,
      focus_areas,
      comment,
      investment_criteria_doc,
      industry_sectors,
      geography,
      valuation_range,
      typical_check_size,
      ownership_leadership,
      minimum_arr,
      sector_min_arr,
      business_model
    ) VALUES (
      investor_id,
      format('Investor %02s Test', idx),
      format('investor%02s@test.pitchfork', idx),
      format('Investor Org %02s', idx),
      format('Focus on %s growth opportunities', sector_choice ->> 'sector'),
      'Automated seed data for QA scenarios.',
      format('Looking for %s companies with ARR between $%s and $%s.',
             sector_choice ->> 'sector',
             to_char(((idx - 1) * 250000)::bigint, 'FM999,999,999'),
             to_char((idx * 400000)::bigint, 'FM999,999,999')),
      jsonb_build_array(sector_choice),
      geography_choice,
      format('$%s to $%s', to_char(((idx - 1) * 1000000 + 3000000)::bigint, 'FM999,999,999'), to_char((idx * 1000000 + 5000000)::bigint, 'FM999,999,999')),
      format('$%s to $%s', to_char(((idx - 1) * 50000 + 100000)::bigint, 'FM999,999,999'), to_char((idx * 50000 + 250000)::bigint, 'FM999,999,999')),
      ownership_choice,
      min_arr_value,
      jsonb_build_array(
        jsonb_build_object(
          'sector', sector_choice ->> 'sector',
          'sub_sector', sector_choice ->> 'sub_sector',
          'min_arr', min_arr_value
        )
      ),
      business_model_choice
    )
    ON CONFLICT (user_id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      firm_name = EXCLUDED.firm_name,
      focus_areas = EXCLUDED.focus_areas,
      comment = EXCLUDED.comment,
      investment_criteria_doc = EXCLUDED.investment_criteria_doc,
      industry_sectors = EXCLUDED.industry_sectors,
      geography = EXCLUDED.geography,
      valuation_range = EXCLUDED.valuation_range,
      typical_check_size = EXCLUDED.typical_check_size,
      ownership_leadership = EXCLUDED.ownership_leadership,
      minimum_arr = EXCLUDED.minimum_arr,
      sector_min_arr = EXCLUDED.sector_min_arr,
      business_model = EXCLUDED.business_model;
  END LOOP;
END $$;

