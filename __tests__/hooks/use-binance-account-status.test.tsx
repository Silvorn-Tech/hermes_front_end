import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useBinanceAccountStatus } from '../../hooks/useBinanceAccountStatus';
import { apiClient } from '../../services/api';

jest.mock('../../services/api', () => {
  const actual = jest.requireActual('../../services/api');
  return {
    ...actual,
    apiClient: {
      getBinanceCredentialStatus: jest.fn(),
    },
  };
});

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => {
  jest.clearAllMocks();
});

it('reflects a not-connected account once the fetch resolves', async () => {
  mockApiClient.getBinanceCredentialStatus.mockResolvedValue({
    configured: false,
    apiKeyLast4: null,
    verifiedAt: null,
    updatedAt: null,
  });

  const { result } = await renderHook(() => useBinanceAccountStatus());

  await waitFor(() => expect(result.current.status).toBe('not-connected'));
  expect(result.current.apiKeyLast4).toBeNull();
});

it('reflects a connected account, including the masked key and verified time', async () => {
  const verifiedAt = new Date().toISOString();
  mockApiClient.getBinanceCredentialStatus.mockResolvedValue({
    configured: true,
    apiKeyLast4: '1234',
    verifiedAt,
    updatedAt: verifiedAt,
  });

  const { result } = await renderHook(() => useBinanceAccountStatus());

  await waitFor(() => expect(result.current.status).toBe('connected'));
  expect(result.current.apiKeyLast4).toBe('1234');
  expect(result.current.verifiedAt).toBe(verifiedAt);
});

it('reflects a fetch failure as "failed", never crashing', async () => {
  mockApiClient.getBinanceCredentialStatus.mockRejectedValue(new Error('network down'));

  const { result } = await renderHook(() => useBinanceAccountStatus());

  await waitFor(() => expect(result.current.status).toBe('failed'));
});

it('reload() re-fetches and can flip the status to connected', async () => {
  mockApiClient.getBinanceCredentialStatus.mockResolvedValueOnce({
    configured: false,
    apiKeyLast4: null,
    verifiedAt: null,
    updatedAt: null,
  });

  const { result } = await renderHook(() => useBinanceAccountStatus());
  await waitFor(() => expect(result.current.status).toBe('not-connected'));

  mockApiClient.getBinanceCredentialStatus.mockResolvedValue({
    configured: true,
    apiKeyLast4: '5678',
    verifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await act(async () => {
    result.current.reload();
  });

  await waitFor(() => expect(result.current.status).toBe('connected'));
  expect(result.current.apiKeyLast4).toBe('5678');
});
