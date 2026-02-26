using API.Services.Interfaces;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace API.Services;

/// Implémentation concrète qui délègue aux méthodes statiques Twilio
public class TwilioClientWrapper : ITwilioClient
{
    /// Initialise TwilioClient avec les credentials
    public TwilioClientWrapper(IConfiguration configuration)
    {
        var accountSid = configuration["Twilio:AccountSid"]
            ?? throw new InvalidOperationException("Twilio:AccountSid is missing");
        var authToken = configuration["Twilio:AuthToken"]
            ?? throw new InvalidOperationException("Twilio:AuthToken is missing");

        TwilioClient.Init(accountSid, authToken);
    }

    /// Envoyer un SMS via Twilio
    public async Task<MessageResource> CreateMessageAsync(PhoneNumber to, PhoneNumber from, string body)
        => await MessageResource.CreateAsync(to: to, from: from, body: body);

    /// Lancer un appel vocal via Twilio
    public async Task<CallResource> CreateCallAsync(
        PhoneNumber to,
        PhoneNumber from,
        Uri url,
        Uri? statusCallback = null,
        IEnumerable<string>? statusCallbackEvent = null)
    {
        return await CallResource.CreateAsync(
            to: to,
            from: from,
            url: url,
            method: Twilio.Http.HttpMethod.Get,
            statusCallback: statusCallback,
            statusCallbackEvent: statusCallbackEvent?.ToList()
        );
    }


}
