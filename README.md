ReadMe.md
=========

Author: Richard Maher 
        maherrj@gmail.com

Release: 23-Aug-2023 - Initial POC release.

Predictor - General purpose Javascript List of Values Object
------------------------------------------------------------

Raison D'etre: - To test the amazing functionality afforded the Web Developer by C# Controller IAsyncEnumerable, and provide examples of output digestion in both Javascript and C# clients.

The streaming of JSON output between producer and consumer creates the infrastructure to support parallelism, with both client and server being able to add-value to the results simultaneously. No more thin-client/forms-based interaction. Rows, or results, can begin to be dissplayed on the web-page as soon as they are available. No waiting for a complete result-set/collection to be delivered atomically, but rather a production-line of UI widgets being rendered as and when available. 

But the real diamond hiding in this example is the use of Cancellation Tokens facilitating the cancellation of server processing from a remote client!

	public async IAsyncEnumerable<dynamic> yieldLastName(string inName, [EnumeratorCancellation]CancellationToken cancellationToken)

Whether due to time-out, a user hitting a hot cancel button, or a now redundant query being superseded by fresh input, there are no orphaned run-away server tasks. And no user wall-time frustration.

This *is* a paradigm shift in result-set data retrieval!

Run-time test considerations
----------------------------

This repository is just a Visual Studio 2022 solution with two projects: -

ChunkIt - A Core WebApi application that productes a web page to query the Person table in

StreamIt - A tiny Console App to show the beauty of JsonSerializer.DeserializeAsyncEnumerable! Once you've looked at the hand-rolled "pipeFactory" Iterator in _Layout.cshtml you'll realize the heavy-lifting the Deserializer does for you.

How To Run It - 

- Open the ChunkIt solution in VS2023 and build it. Make sure you have a copy of the AdventureWorld database and modify the connection String in AppSettings.json to point to it.

- Set the startup Project to ChunkIt and start it without debug. A Web Page will appear wwhere you can enter partial Last Names and Predictor will retrieve any matches.

- Set the startup project to StreamIt and start it with debug and see a list of matches for a hard-coded value.

That's it! All feedback welcomed! 
