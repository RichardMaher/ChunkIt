using System.Net.Http.Headers;
using System.Text.Json;

namespace ChunkIt
{
	public class GetStream
	{
        private const string URL = "https://localhost:7196/data/yieldlastname?inname=sa";
		static async Task Main(string[] args)
        {
			CancellationTokenSource cancellationSource = new CancellationTokenSource();
			CancellationToken cancellationToken = cancellationSource.Token;

			HttpClient client = new HttpClient();
			client.BaseAddress = new Uri(URL);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

			Stream outStream = await client.GetStreamAsync(URL, cancellationToken);

			// DefaultBufferSize should be bigger in production, but is set low to visually feedback paralellism.
			IAsyncEnumerable<SearchName?> resultNames = JsonSerializer.DeserializeAsyncEnumerable<SearchName>(outStream,  new JsonSerializerOptions { AllowTrailingCommas = true, DefaultBufferSize = 500 }, cancellationSource.Token);
			await foreach (SearchName? name in resultNames){
				if (name is not null)
					Console.WriteLine(Uri.UnescapeDataString(name.lastName!));
			}
            client.Dispose();
			Console.WriteLine("Press any key to continue...");
			Console.ReadKey();
		}
    }

	public class SearchName
	{ 
		public string? lastName { get; set; }
		public int hitRate { get; set; }
	}
}