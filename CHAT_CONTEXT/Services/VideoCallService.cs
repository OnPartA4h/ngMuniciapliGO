using API.Services.Interfaces;
using Twilio.Jwt.AccessToken;

namespace API.Services;

/// <summary>
/// Generates Twilio Video access tokens for audio/video calls.
/// Uses the same Twilio credentials as the phone verification service.
/// </summary>
public class VideoCallService : IVideoCallService
{
    private readonly string _accountSid;
    private readonly string _apiKeySid;
    private readonly string _apiKeySecret;
    private readonly ILogger<VideoCallService> _logger;

    public VideoCallService(IConfiguration configuration, ILogger<VideoCallService> logger)
    {
        _accountSid = configuration["Twilio:AccountSid"]
            ?? throw new InvalidOperationException("Twilio:AccountSid is missing");
        _apiKeySid = configuration["Twilio:ApiKeySid"]
            ?? throw new InvalidOperationException("Twilio:ApiKeySid is missing");
        _apiKeySecret = configuration["Twilio:ApiKeySecret"]
            ?? throw new InvalidOperationException("Twilio:ApiKeySecret is missing");
        _logger = logger;
    }

    public string GenerateToken(string userId, string roomName)
    {
        // Create a Video grant for the specific room
        var videoGrant = new VideoGrant { Room = roomName };

        var token = new Token(
            _accountSid,
            _apiKeySid,
            _apiKeySecret,
            identity: userId,
            expiration: DateTime.UtcNow.AddHours(1),
            grants: new HashSet<IGrant> { videoGrant }
        );

        _logger.LogInformation("Twilio Video token generated for user {UserId} in room {Room}", userId, roomName);
        return token.ToJwt();
    }
}
