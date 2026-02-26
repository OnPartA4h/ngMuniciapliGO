using System.Collections.Concurrent;
using API.Services.Interfaces;

namespace API.Services;

/// <summary>
/// In-memory tracker for SignalR connections.
/// Thread-safe via ConcurrentDictionary. Supports multiple connections per user
/// (e.g. multiple browser tabs or devices).
/// Registered as a Singleton so state persists across requests.
/// </summary>
public class PresenceTracker : IPresenceTracker
{
    // userId -> set of connectionIds
    private readonly ConcurrentDictionary<string, HashSet<string>> _onlineUsers = new();
    private readonly object _lock = new();

    public Task UserConnectedAsync(string userId, string connectionId)
    {
        lock (_lock)
        {
            if (!_onlineUsers.TryGetValue(userId, out var connections))
            {
                connections = new HashSet<string>();
                _onlineUsers[userId] = connections;
            }
            connections.Add(connectionId);
        }
        return Task.CompletedTask;
    }

    public Task<bool> UserDisconnectedAsync(string userId, string connectionId)
    {
        bool isFullyOffline = false;

        lock (_lock)
        {
            if (_onlineUsers.TryGetValue(userId, out var connections))
            {
                connections.Remove(connectionId);
                if (connections.Count == 0)
                {
                    _onlineUsers.TryRemove(userId, out _);
                    isFullyOffline = true;
                }
            }
        }

        return Task.FromResult(isFullyOffline);
    }

    public bool IsOnline(string userId)
    {
        return _onlineUsers.TryGetValue(userId, out var connections) && connections.Count > 0;
    }

    public IEnumerable<string> GetOfflineUsers(IEnumerable<string> userIds)
    {
        return userIds.Where(id => !IsOnline(id));
    }

    public Task<IReadOnlyList<string>> GetConnectionsForUserAsync(string userId)
    {
        lock (_lock)
        {
            if (_onlineUsers.TryGetValue(userId, out var connections))
                return Task.FromResult<IReadOnlyList<string>>(connections.ToList());
        }
        return Task.FromResult<IReadOnlyList<string>>(Array.Empty<string>());
    }

    public Task<bool> IsUserOnlineAsync(string userId)
    {
        return Task.FromResult(IsOnline(userId));
    }
}
