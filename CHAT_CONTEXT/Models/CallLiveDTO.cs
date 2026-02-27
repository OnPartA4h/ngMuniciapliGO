using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Models.Models;

namespace Models.DTOs
{
    public class CallLiveDTO
    {
        public int Id { get; set; }
        public string CallSid { get; set; } = default!;
        public string? PhoneNumber { get; set; }
        public string Code { get; set; } = default!;
        public string Language { get; set; } = "fr";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string CallStatus { get; set; } = default!;
        public User Client { get; set; }


        public CallLiveDTO(PhoneCall phoneCall)
        {
            Id = phoneCall.Id;
            CallSid = phoneCall.CallSid;
            PhoneNumber = phoneCall.PhoneNumber;
            Code = phoneCall.Code;
            Language = phoneCall.Language;
            CreatedAt = phoneCall.CreatedAt;
            CallStatus = phoneCall.CallStatus;
            Client = phoneCall.Client;
        }
    }
}
