import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  companyId?: string
}

interface CompanyRecord {
  id: string
  name: string
  industry?: string | null
  industry_sectors?: Array<{ sector: string; sub_sector?: string | null }> | null
  revenue?: string | null
  valuation?: string | null
  country?: string | null
  geography?: string | string[] | null
  investment_round?: number | null
  terms?: string | null
  funding_terms?: string | null
  ownership_leadership?: string[] | string | null
  business_model?: string[] | string | null
}

interface InvestorDetailRecord {
  user_id: string
  name: string
  firm_name?: string | null
  email?: string | null
  industry_sectors?: Array<{ sector: string; sub_sector?: string | null }> | null
  geography?: string[] | string | null
  valuation_range?: string | null
  minimum_arr?: number | null
  sector_min_arr?: Array<{ sector: string; sub_sector?: string | null; min_arr?: number | null }> | null
  ownership_leadership?: string[] | string | null
  business_model?: string[] | string | null
}

interface MatchResult {
  investorId: string
  name: string
  firmName?: string
  email?: string
  score: number
  summary: string[]
}

interface CompanyMatchResult extends MatchResult {
  companyId: string
  companyName: string
  companyIndustry?: string
  companyGeography?: string | string[] | null
}

const clampScore = (value: number) => Math.max(1, Math.min(10, Math.round(value * 10) / 10))

const formatLabel = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())

const normalizeList = (value?: string | string[] | null): string[] => {
  if (!value) return []
  const raw = Array.isArray(value) ? value : value.split(/[,;/|]/)
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .map((item) => item.toLowerCase())
}

const parseAmount = (value?: string | number | null): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = trimmed.match(/(\d+(\.\d+)?)/)
  if (!match) return null
  let amount = parseFloat(match[1])
  const lower = trimmed.toLowerCase()
  if (lower.includes('b')) {
    amount *= 1_000_000_000
  } else if (lower.includes('m')) {
    amount *= 1_000_000
  } else if (lower.includes('k')) {
    amount *= 1_000
  }
  return isNaN(amount) ? null : amount
}

const parseMoneyRange = (value?: string | null) => {
  if (!value) return null
  const parts = value.split(/to|-/i)
  if (parts.length >= 2) {
    const min = parseAmount(parts[0])
    const max = parseAmount(parts[1])
    if (min !== null || max !== null) {
      return {
        min: min ?? max ?? null,
        max: max ?? min ?? null,
      }
    }
  }
  const single = parseAmount(value)
  if (single !== null) {
    return { min: single, max: single }
  }
  return null
}

const toArray = <T,>(value: T | T[] | null | undefined): T[] => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

const normalizeGeography = (value?: string | string[] | null): string[] => {
  if (!value) return []
  const raw = Array.isArray(value) ? value : value.split(/[,;/|]/)
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .map((item) => {
      const lower = item.toLowerCase()
      if (['united states', 'usa', 'us'].includes(lower)) return 'us'
      if (['united kingdom', 'uk', 'britain', 'england'].includes(lower)) return 'uk'
      if (['canada', 'ca'].includes(lower)) return 'canada'
      if (['latin america', 'latam'].includes(lower)) return 'latam'
      if (['global', 'worldwide', 'any'].includes(lower)) return 'global'
      return lower
    })
}

const calculateMatchScore = (company: CompanyRecord, investor: InvestorDetailRecord): MatchResult => {
  let weightedTotal = 0
  let weightSum = 0
  const summary: string[] = []

  const companySectorRecords = toArray(company.industry_sectors)
  const companySectorNames = companySectorRecords
    .map((s) => s?.sector?.trim())
    .filter(Boolean) as string[]
  const companySectors = companySectorNames.map((sector) => sector.toLowerCase())
  const companyIndustry = company.industry?.trim().toLowerCase()

  const investorSectorRecords = toArray(investor.industry_sectors)
  const investorSectorNames = investorSectorRecords
    .map((s) => s?.sector?.trim())
    .filter(Boolean) as string[]
  const investorSectors = investorSectorNames.map((sector) => sector.toLowerCase())

  const sectorWeight = 0.5
  const revenueWeight = 0.3
  const valuationWeight = 0.08
  const geographyWeight = 0.05
  const ownershipWeight = 0.035
  const businessWeight = 0.035

  const hasCompanySectorInfo = companySectors.length > 0 || Boolean(companyIndustry)
  let sectorMismatch = false

  const overlappingSectors = investorSectorNames.filter((sector) => {
    const lower = sector.toLowerCase()
    return lower && (companySectors.includes(lower) || lower === companyIndustry)
  })

  if (investorSectors.length > 0) {
    if (overlappingSectors.length === 0) {
      sectorMismatch = true
      summary.push('Sector fit: no overlap with investor focus')
    } else {
      weightedTotal += 10 * sectorWeight
      weightSum += sectorWeight
      summary.push(`Sector fit: aligned with ${overlappingSectors.map(formatLabel).join(', ')}`)
    }
  }

  if (!hasCompanySectorInfo) {
    sectorMismatch = true
    summary.push('Sector fit: company did not provide sector data')
  }

  const companyRevenue = parseAmount(company.revenue ?? undefined)
  let investorMinArr = investor.minimum_arr ?? null

  if (companySectors.length > 0 && investor.sector_min_arr?.length) {
    const sectorSpecific = investor.sector_min_arr.find((item) => {
      const sectorLower = item.sector?.toLowerCase()
      return sectorLower && companySectors.includes(sectorLower)
    })
    if (sectorSpecific?.min_arr !== undefined && sectorSpecific?.min_arr !== null) {
      investorMinArr = sectorSpecific.min_arr
    }
  }

  if (companyRevenue !== null && investorMinArr !== null) {
    const ratio = companyRevenue / investorMinArr
    const score = clampScore(ratio >= 1 ? Math.min(10, 7 + (ratio - 1) * 3) : Math.max(2, ratio * 7))
    weightedTotal += score * revenueWeight
    weightSum += revenueWeight
    summary.push(
      ratio >= 1
        ? `Revenue meets minimum (≥ $${(investorMinArr / 1_000_000).toFixed(1)}M)`
        : `Revenue below target (needs ≥ $${(investorMinArr / 1_000_000).toFixed(1)}M)`
    )
  } else if (investorMinArr !== null) {
    weightedTotal += 5 * revenueWeight
    weightSum += revenueWeight
    summary.push('Revenue not provided by company')
  }

  const companyValuation = parseAmount(company.valuation ?? undefined)
  const valuationRange = parseMoneyRange(investor.valuation_range ?? undefined)
  if (companyValuation !== null && valuationRange) {
    const { min, max } = valuationRange
    if (min !== null && max !== null) {
      let score: number
      if (companyValuation >= min && companyValuation <= max) {
        score = 10
        summary.push('Valuation within preferred range')
      } else {
        const distance = companyValuation < min ? min - companyValuation : companyValuation - max
        const divisor = Math.max(max - min, min || max || 1)
        score = clampScore(Math.max(3, 10 - (distance / divisor) * 7))
        summary.push('Valuation slightly outside preferred range')
      }
      weightedTotal += score * valuationWeight
      weightSum += valuationWeight
    }
  }

  const companyGeos = normalizeGeography(company.geography ?? company.country)
  const investorGeos = normalizeGeography(investor.geography)

  if (investorGeos.length > 0) {
    if (companyGeos.length === 0) {
      weightedTotal += 5 * geographyWeight
      weightSum += geographyWeight
      summary.push('Geography preference not provided by company')
    } else {
      const geoMatch = companyGeos.some(
        (geo) => investorGeos.includes(geo) || investorGeos.includes('global')
      )
      weightedTotal += (geoMatch ? 10 : 2) * geographyWeight
      weightSum += geographyWeight
      summary.push(`Geography fit (${companyGeos.map(formatLabel).join(', ')})`)
    }
  }

  const companyOwnershipExplicit = normalizeList(company.ownership_leadership)
  const ownershipFromText = `${company.terms ?? ''} ${company.funding_terms ?? ''}`
  const companyOwnershipTokens =
    companyOwnershipExplicit.length > 0
      ? companyOwnershipExplicit
      : ownershipFromText
          .split(/[,\s;/|]+/)
          .map((token) => token.trim().toLowerCase())
          .filter(Boolean)

  const investorOwnership = normalizeList(investor.ownership_leadership)
  if (investorOwnership.length > 0) {
    const hasGeneral = investorOwnership.includes('general')
    const hasSpecific = investorOwnership.some((pref) => pref !== 'general')

    if (!hasSpecific && hasGeneral) {
      weightedTotal += 10 * ownershipWeight
      weightSum += ownershipWeight
      summary.push('Ownership: investor open to all (General preference)')
    } else if (companyOwnershipTokens.length === 0) {
      weightedTotal += (hasGeneral ? 8 : 4) * ownershipWeight
      weightSum += ownershipWeight
      summary.push('Ownership preference not provided by company')
    } else {
      const ownershipMatch = companyOwnershipTokens.some(
        (token) => hasGeneral || investorOwnership.includes(token)
      )
      weightedTotal += (ownershipMatch ? 10 : 3) * ownershipWeight
      weightSum += ownershipWeight
      summary.push(
        ownershipMatch
          ? 'Ownership preference aligned'
          : 'Ownership preference outside investor focus'
      )
    }
  }

  const companyBusinessModels = normalizeList(company.business_model)
  const investorBusinessModels = normalizeList(investor.business_model)
  if (investorBusinessModels.length > 0) {
    if (companyBusinessModels.length === 0) {
      weightedTotal += 5 * businessWeight
      weightSum += businessWeight
      summary.push('Business model not provided by company')
    } else {
      const matchedModel = companyBusinessModels.find((model) =>
        investorBusinessModels.includes(model)
      )
      weightedTotal += (matchedModel ? 10 : 3) * businessWeight
      weightSum += businessWeight
      summary.push(
        matchedModel
          ? `Business model aligned (${formatLabel(matchedModel)})`
          : 'Business model outside investor focus'
      )
    }
  }

  if (weightSum === 0) {
    return {
      investorId: investor.user_id,
      name: investor.name || 'Unnamed Investor',
      firmName: investor.firm_name || undefined,
      email: investor.email || undefined,
      score: 1,
      summary: ['Insufficient data to score'],
    }
  }

  const baseScore = clampScore(weightedTotal / weightSum)

  return {
    investorId: investor.user_id,
    name: investor.name || 'Unnamed Investor',
    firmName: investor.firm_name || undefined,
    email: investor.email || undefined,
    score: sectorMismatch ? clampScore(Math.min(baseScore, 3)) : baseScore,
    summary,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { companyId }: RequestBody = await req.json().catch(() => ({}))

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'companyId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase environment variables are not set')
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    const { data: company, error: companyError } = await supabaseAdmin
      .from<CompanyRecord>('companies')
      .select('*')
      .eq('id', companyId)
      .maybeSingle()

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: 'Company not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: investors, error: investorsError } = await supabaseAdmin
      .from<InvestorDetailRecord>('investor_details')
      .select('*')

    if (investorsError || !investors) {
      return new Response(JSON.stringify({ error: 'Unable to load investor preferences' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const matches: CompanyMatchResult[] = investors
      .map((investor) => {
        const result = calculateMatchScore(company, investor)
        return {
          ...result,
          companyId: company.id,
          companyName: company.name,
          companyIndustry: company.industry ?? undefined,
          companyGeography: company.geography ?? company.country ?? null,
        }
      })
      .sort((a, b) => b.score - a.score)

    return new Response(
      JSON.stringify({
        company: {
          id: company.id,
          name: company.name,
          industry: company.industry,
          geography: company.geography ?? company.country ?? null,
        },
        matches,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in company-investor-match function:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

