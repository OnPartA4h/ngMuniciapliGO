using System.Collections.Concurrent;
using API.Services.Interfaces;

namespace API.Services;

/// <summary>
/// In-memory tracker for active video/audio calls.
/// Thread-safe via ConcurrentDictionary.
///
/// KEY DESIGN: each room has a TTL (90 seconds from last activity).
/// If a caller disconnects without calling /hangup (app crash, network loss),
/// the stale room is automatically treated as empty on the next TryStartCall,
/// so a new call can be initiated without being stuck forever.
/// </summary>
public class ActiveCallTracker : IActiveCallTracker
{
    // How long a room stays "active" without any participant update
    private static readonly TimeSpan RoomTtl = TimeSpan.FromSeconds(90);

    private sealed class RoomState
    {
        public ConcurrentDictionary<string, byte> Participants { get; } = new();
        public DateTime LastActivity { get; set; } = DateTime.UtcNow;

        public bool IsExpired => DateTime.UtcNow - LastActivity > RoomTtl;
    }

    // roomName → room state
    private readonly ConcurrentDictionary<string, RoomState> _activeCalls = new();

    public bool TryStartCall(string roomName, string callerId)
    {
        // If the room exists but is expired (no hangup was called), wipe it first
        if (_activeCalls.TryGetValue(roomName, out var existing) && existing.IsExpired)
        {
            _activeCalls.TryRemove(roomName, out _);
        }

        var room = _activeCalls.GetOrAdd(roomName, _ => new RoomState());
        var wasEmpty = room.Participants.IsEmpty;
        room.Participants.TryAdd(callerId, 0);
        room.LastActivity = DateTime.UtcNow;
        return wasEmpty; // true = first participant → new call
    }

    public bool ParticipantLeft(string roomName, string userId)
    {
        if (!_activeCalls.TryGetValue(roomName, out var room))
            return true;

        room.Participants.TryRemove(userId, out _);
        room.LastActivity = DateTime.UtcNow;

        if (room.Participants.IsEmpty)
        {
            _activeCalls.TryRemove(roomName, out _);
            return true;
        }

        return false;
    }

    public bool IsCallActive(string roomName)
    {
        return _activeCalls.TryGetValue(roomName, out var room)
               && !room.IsExpired
               && !room.Participants.IsEmpty;
    }

    public void EndCall(string roomName)
    {
        _activeCalls.TryRemove(roomName, out _);
    }
}
