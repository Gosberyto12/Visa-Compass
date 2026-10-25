import type { VisaProvider } from "../visa-types";

/**
 * Sherpa integration boundary.
 *
 * IMPORTANT: This intentionally does not guess Sherpa's endpoint, authentication
 * header, or request/response schema. Fill in the mapping only after Sherpa
 * supplies approved documentation and sandbox credentials.
 */
export const sherpaVisaProvider: VisaProvider = {
  async check() {
    const baseUrl = process.env.SHERPA_API_BASE_URL?.trim();
    const apiKey = process.env.SHERPA_API_KEY?.trim();

    if (!baseUrl || !apiKey) {
      throw new Error(
        "Sherpa is not configured. Set SHERPA_API_BASE_URL and SHERPA_API_KEY after receiving approved Sherpa API access."
      );
    }

    // Do not send requests until the exact Sherpa contract is mapped and tested.
    // Implement the authenticated fetch, timeout, response validation, and
    // normalization here using Sherpa's official docs—not guessed field names.
    throw new Error(
      "Sherpa credentials are present, but the provider contract adapter has not been implemented. Add the verified endpoint and schema mapping from Sherpa's documentation before enabling live requests."
    );
  },
};
