using Microsoft.AspNetCore.Mvc;
using System.Runtime.CompilerServices;
using System.Transactions;
using System.Data.SqlClient;
using System.Diagnostics;

namespace ChunkIt
{

    public class DataController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly string connStr;
        public DataController(IConfiguration configuration) 
        { 
            _configuration = configuration;
            connStr = _configuration.GetConnectionString("AWDB");
        }

        [HttpGet]
        public async IAsyncEnumerable<dynamic> yieldLastName(string inName, [EnumeratorCancellation]CancellationToken cancellationToken)
		{
    		if (string.IsNullOrWhiteSpace(inName))
			{
                Console.WriteLine("Illeagal Parameter. inName is mandatory.");
                yield break;
			}

            // alter database [AdventureWorks2022] set ALLOW_SNAPSHOT_ISOLATION on;
            TransactionOptions txnOpts = new TransactionOptions() { IsolationLevel = IsolationLevel.Snapshot };

            List<dynamic> namesSelect = new List<dynamic>();

            SqlParameter searchName = new SqlParameter("LastName", System.Data.SqlDbType.Char);
            searchName.Value = inName + "%";

            var sql = @"
                select 
                      LastName,
                      count(*) as hitRate
                from 
                      Person.Person P
                where
                      LastName like @LastName
                group by
                      LastName
                ";

            using (TransactionScope scope = new TransactionScope(TransactionScopeOption.RequiresNew, txnOpts, TransactionScopeAsyncFlowOption.Enabled))
            {
                using (SqlConnection cxn = new SqlConnection(connStr))
                {
                    SqlCommand cmd = new SqlCommand(sql, cxn);
                    cmd.Parameters.Add(searchName);
                    cmd.CommandTimeout = 120000;
                    SqlDataReader reader = null!;
                    Boolean hasRows = false;

                    try
                    {
                        await cxn.OpenAsync(cancellationToken);
                        reader = await cmd.ExecuteReaderAsync(cancellationToken);
                        hasRows = await reader.ReadAsync(cancellationToken);
                    }
                    catch (TaskCanceledException ex) when (ex.CancellationToken == cancellationToken) { }

                    while (!cancellationToken.IsCancellationRequested && hasRows)
                    {
                        string lastName = "";
                        int hitRate = 0;

                        if (!reader.IsDBNull(0))
                        {
                            lastName = reader.GetString(0);
                        }
                        hitRate = reader.GetInt32(1);

                        yield return new
                        {
                            LastName = Uri.EscapeDataString(lastName),
                            HitRate = hitRate
                        };

                        try
                        {
                            hasRows = await reader.ReadAsync(cancellationToken);
                        }
                        catch (TaskCanceledException ex) when (ex.CancellationToken == cancellationToken) { }

//                        await Task.Delay(100);  // Slow down the Demo
                    }
                }
                scope.Complete();
            }
        } 
    }
}
