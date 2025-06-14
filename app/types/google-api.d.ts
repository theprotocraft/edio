interface Window {
  gapi: {
    load: (api: string, callback: () => void) => void;
    client: {
      init: (config: {
        apiKey: string;
        clientId: string;
        discoveryDocs: string[];
        scope: string;
      }) => Promise<void>;
      youtube: {
        channels: {
          list: (params: {
            part: string;
            mine: boolean;
          }) => Promise<{
            result: {
              items: Array<{
                id: string;
                snippet: {
                  title: string;
                  thumbnails: {
                    default: {
                      url: string;
                    };
                  };
                };
              }>;
            };
          }>;
        };
      };
    };
    auth2: {
      getAuthInstance: () => {
        isSignedIn: {
          get: () => boolean;
          listen: (callback: (isSignedIn: boolean) => void) => void;
        };
        signIn: () => Promise<void>;
        currentUser: {
          get: () => {
            getAuthResponse: () => {
              access_token: string;
              refresh_token: string;
              expires_in: number;
            };
          };
        };
      };
    };
  };
  google: {
    accounts: {
      oauth2: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: {
            access_token?: string;
            refresh_token?: string;
            expires_in?: number;
            error?: string;
          }) => void;
        }) => {
          requestAccessToken: () => void;
        };
      };
    };
  };
} 