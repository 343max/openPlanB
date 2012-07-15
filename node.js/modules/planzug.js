var planUtils = require('./plan_utils.js');

function decodePlanZUG(filename, outputFile) {
	var header = {unknown:[]};
	
	var f = new planUtils.PlanFile(filename);
	
	header.size = f.readInteger(2);
	header.version = f.readInteger(2) + '.' + f.readInteger(2);
	header.creationDate = f.readTimestamp();
	
	header.listLength1 = f.readInteger(4);
	// number of routes in LAUF list1
	header.numberOfRoutes = f.readInteger(4);
	header.unknown.push(f.readInteger(4));
	// number of stations in B list1
	header.numberOfStations = f.readInteger(4);
	
	header.validityBegin = f.readInteger(2);
	header.validityEnd = f.readInteger(2);
	
	header.description = f.readString(header.size - f.pos);
	
	var
		data1 = [];
		
	for (var i = 0; i < header.listLength1; i++) {
		data1[i] = [];
		// operation frequency b
		// b & 0x7f               number of iterations
		// (b & 0xff80) >> 7      interval in minutes between each operation
		data1[i][0] = f.readInteger(2);
	}
	header.blockSize = (f.length - f.pos)/(2*header.listLength1);
	
	// strange: block size seems to vary
	if (header.blockSize != 11 && header.blockSize != 12) {
		throw "don't know how to handle blockSize " + header.blockSize;
	}

	for (var i = 0; i < header.listLength1; i++) {
		// days of operation for this train
		// offset in W, list 1, or zero (train operates every day)
		// TODO: don't know when which interpretation of value holds
		if (header.blockSize == 12)
			data1[i][1] = f.readInteger(4);
		else
			data1[i][1] = f.readInteger(2);
		
		// UNKNOWN
		// probably a reference to an offset in UK list 1
		data1[i][2] = f.readInteger(2);
		// UNKNOWN
		// TODO: ?
		// data1[i][3] & 256   -> look up field 9 in ATR list 4, else it is a RICH id
		// data1[i][3] & 512   -> look up field 9 in ATR list 4, else it is a RICH id
		// data1[i][3] & 2048   -> look up field 10 in ATR list 5, else there is no border crossing
		data1[i][3] = f.readInteger(2);
		
		//     train number 
		// OR  offset in ATR, list 1
		// OR  id in LINE
		//
		data1[i][4] = f.readInteger(2);
		
		// TODO: the following is still experimental
		//
		// bitset b
		//  if b & 0x100, then add 2^32 to train number
		//  if b == 0, then interpretation 'offset' above
		//  (b & 0xfe) >> 1   is reference to entry in GAT list 1
		//data1[i][5] = f.readBinDump(2)
		//data1[i][6] = f.readBinDump(2)
		data1[i][5] = f.readInteger(2);

		// attributes of this train (offset to ATR, list 2)
		data1[i][6] = f.readInteger(2);
		
		// UNKNOWN
		data1[i][7] = f.readInteger(2);
		
		// route of this train (references a LAUF id)
		data1[i][8] = f.readInteger(4);
		
		// a direction (references a RICH id, or ATR list 4, or zero)
		// TODO: don't know when which interpretation of value holds
		data1[i][9] = f.readInteger(2);
		
		// border crossing of this train (offset to ATR, list 5, or zero)
		// TODO: don't know when which interpretation of value holds
		data1[i][10] = f.readInteger(2);
	}

	header.bytesLeft = f.check(outputFile);
	
	// Datenstruktur erzeugen
	var
		data = [];
	
	for (var i = 0; i < data1.length; i++) {
		var trainType = data1[i][5] >> 9;
		var trainNumber = data1[i][4];
		
		data.push({
			id: i,
			laufId: data1[i][8],
			wId: data1[i][1],
			trainNumber: trainNumber,
			trainNumberFlags: (data1[i][5] & 0x1ff),
			trainType: trainType,
			atr2Id: data1[i][6],
			atr5Id: data1[i][10],
			frequency: {
				iterations: (data1[i][0] & 0x7f),
				interval: ((data1[i][0] & 0xff80) >> 7)
			},
			unknown2: data1[i][2],
			unknown3: data1[i][3],
			unknown4: data1[i][7],
			unknown5: data1[i][9]
		});
	}
	
	planUtils.exportHeader(outputFile, header);
	planUtils.exportTSV(outputFile, '1', data1);
	planUtils.exportJSON(outputFile, 'data', data);
}

exports.decodePlan = decodePlanZUG;
